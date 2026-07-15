# v0.2.20
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *

import json
import typing
import hashlib


@gl.evm.contract_interface
class _EoaRecipient:
    """Minimal external interface used for GEN repayments to wallet accounts."""
    class View:
        pass

    class Write:
        pass


class HapilProtocol(gl.Contract):
    """
    Hapil Protocol - Decentralized Appeals and Evidence Consensus.

    Users appeal existing verdicts by staking GEN and submitting genuinely
    new public evidence (URLs + hashes only). GenLayer validators evaluate
    the appeal non-deterministically and reach consensus on whether the case
    should be reopened. Weak appeals are slashed; strong appeals unlock
    review and the stake is returned.
    """

    owner: str
    min_stake: u256          # minimum GEN (wei) required to file an appeal
    appeal_counter: u256
    slashed_pool: u256       # total GEN slashed from rejected appeals

    # appeals[appeal_id] -> JSON appeal record
    appeals: TreeMap[str, str]
    # evidence[appeal_id] -> JSON list of evidence items
    evidence: TreeMap[str, str]
    # consensus[appeal_id] -> JSON consensus result
    consensus: TreeMap[str, str]
    # stakes[appeal_id] -> locked stake amount (wei, as string)
    stakes: TreeMap[str, str]
    # appeals_by_owner[wallet] -> "0|1|2" pipe-joined appeal ids
    appeals_by_owner: TreeMap[str, str]
    # Immutable, registrar-authenticated source records keyed by case id.
    cases: TreeMap[str, str]
    # Address maps use "1" / "" because persistent booleans are not needed.
    case_registrars: TreeMap[str, str]
    authorized_reviewers: TreeMap[str, str]

    def __init__(self, min_stake: int = 1000000000000000000):
        self.owner = gl.message.sender_address.as_hex
        self.min_stake = u256(min_stake)
        self.appeal_counter = u256(0)
        self.slashed_pool = u256(0)

        self.appeals = TreeMap()
        self.evidence = TreeMap()
        self.consensus = TreeMap()
        self.stakes = TreeMap()
        self.appeals_by_owner = TreeMap()
        self.cases = TreeMap()
        self.case_registrars = TreeMap()
        self.authorized_reviewers = TreeMap()
        self.case_registrars[self.owner.lower()] = "1"

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _sender(self) -> str:
        return gl.message.sender_address.as_hex.lower()

    def _json(self, value: typing.Any) -> str:
        return json.dumps(value, sort_keys=True)

    def _load(self, raw: str) -> typing.Any:
        if raw is None or raw == "":
            return {}
        return json.loads(raw)

    def _require_non_empty(self, value: str, field_name: str) -> None:
        if value is None or len(value.strip()) == 0:
            raise gl.vm.UserError(field_name + " is required")

    def _is_authorized(self, addresses: TreeMap[str, str], account: str) -> bool:
        return account.lower() == self.owner.lower() or addresses.get(account.lower(), "") == "1"

    def _require_hex_hash(self, value: str, field_name: str) -> str:
        value = str(value).strip().lower()
        if len(value) != 66 or not value.startswith("0x"):
            raise gl.vm.UserError(field_name + " must be a 0x-prefixed SHA-256 hash")
        for char in value[2:]:
            if char not in "0123456789abcdef":
                raise gl.vm.UserError(field_name + " must be a 0x-prefixed SHA-256 hash")
        return value

    def _case(self, case_id: str) -> typing.Any:
        raw = self.cases.get(case_id, "")
        if raw == "":
            raise gl.vm.UserError("Case is not registered by an authorized registrar")
        return self._load(raw)

    def _limit(self, value: typing.Any, max_len: int) -> str:
        text = str(value)
        if len(text) > max_len:
            return text[:max_len]
        return text

    def _to_int(self, value: typing.Any, fallback: int) -> int:
        text = str(value).strip()
        try:
            return int(text)
        except Exception:
            pass
        # Tolerate LLM-returned decimals like "80.0" without using float().
        if "." in text:
            whole = text.split(".", 1)[0]
            try:
                return int(whole)
            except Exception:
                return fallback
        return fallback

    def _bounded_score(self, value: typing.Any, fallback: int) -> int:
        score = self._to_int(value, fallback)
        if score < 0:
            return 0
        if score > 100:
            return 100
        return score

    def _list_of_strings(self, value: typing.Any, max_items: int, max_len: int) -> typing.List[str]:
        result: typing.List[str] = []
        if isinstance(value, list):
            for item in value:
                if len(result) >= max_items:
                    break
                result.append(self._limit(item, max_len))
            return result
        if value is None:
            return result
        text = str(value)
        if len(text.strip()) == 0:
            return result
        result.append(self._limit(text, max_len))
        return result

    def _require_appeal_exists(self, appeal_id: str) -> typing.Any:
        raw = self.appeals.get(appeal_id, "")
        if raw == "":
            raise gl.vm.UserError("Appeal not found")
        return self._load(raw)

    def _normalise_appeal_status(self, value: typing.Any) -> str:
        status = str(value).strip().upper()
        if status in ["ACCEPTED", "ACCEPT", "APPROVED", "APPROVE", "VALID", "UPHELD"]:
            return "Accepted"
        if status in ["REJECTED", "REJECT", "DENIED", "DENY", "INVALID", "DISMISSED"]:
            return "Rejected"
        return "Rejected"

    def _normalise_impact(self, value: typing.Any) -> str:
        impact = str(value).strip().upper()
        if impact in ["NONE", "LOW", "MEDIUM", "HIGH"]:
            return impact.capitalize()
        return "None"

    def _normalise_recommendation(self, value: typing.Any, accepted: bool) -> str:
        rec = str(value).strip().upper().replace("_", " ")
        if "REOPEN" in rec:
            return "Reopen Original Case"
        if "REVISE" in rec or "REVISED" in rec:
            return "Revise Verdict"
        if "UPHOLD" in rec or "STAND" in rec:
            return "Uphold Original Verdict"
        return "Reopen Original Case" if accepted else "Uphold Original Verdict"

    def _parse_llm_json(self, raw: typing.Any) -> typing.Any:
        if isinstance(raw, dict):
            return raw
        text = str(raw)
        first = text.find("{")
        last = text.rfind("}")
        if first == -1 or last == -1:
            raise gl.vm.UserError("[LLM_ERROR] Response contains no JSON object")
        try:
            return json.loads(text[first:last + 1])
        except Exception:
            raise gl.vm.UserError("[LLM_ERROR] Response is not valid JSON")

    def _normalise_review(self, raw: typing.Any) -> typing.Any:
        parsed = self._parse_llm_json(raw)

        status = self._normalise_appeal_status(parsed.get("appeal_status", "Rejected"))
        accepted = status == "Accepted"
        impact = self._normalise_impact(parsed.get("material_impact", "None"))

        # Economic rule enforced on-chain regardless of model output:
        # acceptance requires at least Medium material impact.
        if accepted and impact not in ["Medium", "High"]:
            status = "Rejected"
            accepted = False

        return {
            "appeal_status": status,
            "appeal_strength_score": self._bounded_score(parsed.get("appeal_strength_score", 0), 0),
            "evidence_novelty_score": self._bounded_score(parsed.get("evidence_novelty_score", 0), 0),
            "material_impact": impact,
            "confidence_score": self._bounded_score(parsed.get("confidence_score", 50), 50),
            "stake_outcome": "Returned" if accepted else "Slashed",
            "verdict_recommendation": self._normalise_recommendation(
                parsed.get("verdict_recommendation", ""), accepted
            ),
            "reasoning": self._limit(parsed.get("reasoning", ""), 1600),
            "supporting_evidence": self._list_of_strings(parsed.get("supporting_evidence", []), 12, 320),
            "next_action": self._limit(parsed.get("next_action", ""), 600),
        }

    # ------------------------------------------------------------------
    # Views
    # ------------------------------------------------------------------

    @gl.public.view
    def get_config(self) -> str:
        return self._json({
            "owner": self.owner,
            "min_stake": str(self.min_stake),
            "appeal_count": str(self.appeal_counter),
            "slashed_pool": str(self.slashed_pool),
        })

    @gl.public.view
    def get_appeal(self, appeal_id: int) -> str:
        raw = self.appeals.get(str(appeal_id), "")
        if raw == "":
            return "{}"
        return raw

    @gl.public.view
    def get_appeals(self, offset: int = 0, limit: int = 50) -> str:
        """Paginated list of appeal records, newest first."""
        out = []
        total = int(self.appeal_counter)
        start = total - 1 - offset
        end = max(start - limit + 1, 0)
        i = start
        while i >= end:
            raw = self.appeals.get(str(i), "")
            if raw != "":
                out.append(json.loads(raw))
            i -= 1
        return self._json({"total": total, "appeals": out})

    @gl.public.view
    def get_appeals_by_owner(self, owner: str) -> str:
        ids = self.appeals_by_owner.get(owner.lower(), "")
        if ids == "":
            return "[]"
        out = []
        for i in ids.split("|"):
            raw = self.appeals.get(i, "")
            if raw != "":
                out.append(json.loads(raw))
        return self._json(out)

    @gl.public.view
    def get_evidence(self, appeal_id: int) -> str:
        raw = self.evidence.get(str(appeal_id), "")
        return raw if raw != "" else "[]"

    @gl.public.view
    def get_consensus(self, appeal_id: int) -> str:
        raw = self.consensus.get(str(appeal_id), "")
        return raw if raw != "" else "{}"

    @gl.public.view
    def get_stake(self, appeal_id: int) -> str:
        raw = self.stakes.get(str(appeal_id), "")
        return raw if raw != "" else "0"

    @gl.public.view
    def get_case(self, case_id: str) -> str:
        raw = self.cases.get(case_id, "")
        return raw if raw != "" else "{}"

    # ------------------------------------------------------------------
    # Case registry. A case is created once by an explicit authorized role,
    # then treated as immutable evidence of the verdict being appealed.
    # ------------------------------------------------------------------

    @gl.public.write
    def set_authorized_role(self, account: str, role: str, enabled: bool) -> None:
        if self._sender() != self.owner.lower():
            raise gl.vm.UserError("Only owner")
        key = Address(account).as_hex.lower()
        role_name = role.strip().lower()
        target = self.case_registrars if role_name == "case_registrar" else self.authorized_reviewers if role_name == "reviewer" else None
        if target is None:
            raise gl.vm.UserError("role must be case_registrar or reviewer")
        target[key] = "1" if enabled else ""

    @gl.public.write
    def register_case(self, case_id: str, final_verdict: str, original_evidence_hashes_json: str, finalized_at: str) -> str:
        if not self._is_authorized(self.case_registrars, self._sender()):
            raise gl.vm.UserError("Only an authorized case registrar")
        self._require_non_empty(case_id, "case_id")
        self._require_non_empty(final_verdict, "final_verdict")
        case_id = self._limit(case_id.strip(), 200)
        if self.cases.get(case_id, "") != "":
            raise gl.vm.UserError("Case already registered; case records are immutable")
        try:
            supplied_hashes = json.loads(original_evidence_hashes_json)
        except Exception:
            raise gl.vm.UserError("original_evidence_hashes_json must be a JSON array")
        if not isinstance(supplied_hashes, list):
            raise gl.vm.UserError("original_evidence_hashes_json must be a JSON array")
        hashes: typing.List[str] = []
        for item in supplied_hashes:
            digest = self._require_hex_hash(str(item), "original evidence hash")
            if digest not in hashes:
                hashes.append(digest)
        record = {
            "case_id": case_id,
            "final_verdict": self._limit(final_verdict, 2000),
            "original_evidence_hashes": hashes,
            "finalized_at": self._limit(finalized_at, 80),
            "registered_by": self._sender(),
        }
        self.cases[case_id] = self._json(record)
        return self._json(record)

    # Step 1 + 2: Create appeal and lock GEN stake
    # ------------------------------------------------------------------

    @gl.public.write.payable
    def create_appeal(
        self,
        case_id: str,
        appeal_reason: str,
        created_at: str,
    ) -> str:
        stake = int(gl.message.value)
        if stake < int(self.min_stake):
            raise gl.vm.UserError("Stake below minimum required GEN")
        self._require_non_empty(case_id, "case_id")
        self._require_non_empty(appeal_reason, "appeal_reason")
        case_id = self._limit(case_id.strip(), 200)
        case = self._case(case_id)

        appeal_id = str(int(self.appeal_counter))
        sender = self._sender()

        record = {
            "id": int(appeal_id),
            "case_id": case_id,
            "original_verdict": case.get("final_verdict", ""),
            "case_record": case,
            "appeal_reason": self._limit(appeal_reason, 2000),
            "owner": sender,
            "stake": str(stake),
            "status": "Draft",           # Draft -> Accepted / Rejected
            "stake_outcome": "Locked",   # Locked -> Returned / Slashed
            "created_at": created_at,
            "evidence_count": 0,
        }

        self.appeals[appeal_id] = self._json(record)
        self.stakes[appeal_id] = str(stake)
        self.appeal_counter = self.appeal_counter + u256(1)

        existing = self.appeals_by_owner.get(sender, "")
        if existing == "":
            self.appeals_by_owner[sender] = appeal_id
        else:
            self.appeals_by_owner[sender] = existing + "|" + appeal_id

        return self._json({"appeal_id": int(appeal_id)})

    # ------------------------------------------------------------------
    # Step 3: Submit new public evidence (URL references only)
    # ------------------------------------------------------------------

    @gl.public.write
    def submit_evidence(
        self,
        appeal_id: int,
        title: str,
        evidence_type: str,
        url: str,
        evidence_hash: str,
        source: str,
        relevance: str,
        submitted_at: str,
    ) -> str:
        key = str(appeal_id)
        rec = self._require_appeal_exists(key)
        if rec.get("owner", "") != self._sender():
            raise gl.vm.UserError("Only the appellant can submit evidence")
        if rec.get("status", "") != "Draft":
            raise gl.vm.UserError("Evidence can only be added before review starts")
        self._require_non_empty(title, "title")
        self._require_non_empty(url, "url")
        self._require_non_empty(relevance, "relevance")
        evidence_hash = self._require_hex_hash(evidence_hash, "evidence_hash")
        if not url.startswith("http://") and not url.startswith("https://"):
            raise gl.vm.UserError("Evidence URL must be a public http(s) link")

        raw_items = self.evidence.get(key, "")
        items = json.loads(raw_items) if raw_items != "" else []
        case = self._case(rec.get("case_id", ""))
        if evidence_hash in case.get("original_evidence_hashes", []):
            raise gl.vm.UserError("Evidence already exists in the authoritative case record")
        for existing in items:
            if existing.get("hash", "").lower() == evidence_hash:
                raise gl.vm.UserError("Duplicate evidence content hash")
        items.append({
            "index": len(items),
            "title": self._limit(title, 300),
            "type": self._limit(evidence_type, 120),
            "url": self._limit(url, 800),
            "hash": evidence_hash,
            "source": self._limit(source, 300),
            "relevance": self._limit(relevance, 1200),
            "submitter": self._sender(),
            "submitted_at": submitted_at,
        })
        self.evidence[key] = self._json(items)

        rec["evidence_count"] = len(items)
        self.appeals[key] = self._json(rec)
        return self._json({"evidence_count": len(items)})

    # ------------------------------------------------------------------
    # Steps 4-6: Non-deterministic evaluation and consensus formation
    # ------------------------------------------------------------------

    @gl.public.write
    def request_review(self, appeal_id: int) -> str:
        key = str(appeal_id)
        rec = self._require_appeal_exists(key)
        if rec.get("owner", "") != self._sender() and not self._is_authorized(self.authorized_reviewers, self._sender()):
            raise gl.vm.UserError("Only the appellant or an authorized reviewer can finalize review")
        if rec.get("status", "") != "Draft":
            raise gl.vm.UserError("Appeal already reviewed")
        raw_items = self.evidence.get(key, "")
        if raw_items == "" or len(json.loads(raw_items)) == 0:
            raise gl.vm.UserError("At least one piece of new evidence is required")

        evidence_items = json.loads(raw_items)

        def evaluate_appeal() -> str:
            # Hash the exact fetched bytes before presenting content to validators.
            # A URL that changed after commitment, or an unreachable URL, cannot
            # qualify as verified new evidence.
            fetched_evidence = []
            for item in evidence_items:
                url = item.get("url", "")
                page_text = ""
                verified = False
                actual_hash = ""
                if url:
                    try:
                        response = gl.nondet.web.get(url)
                        body = response.body
                        actual_hash = "0x" + hashlib.sha256(body).hexdigest()
                        verified = actual_hash == item.get("hash", "").lower()
                        page_text = self._limit(body.decode("utf-8", errors="ignore"), 4000)
                    except Exception:
                        page_text = "[FETCH_FAILED: could not retrieve this URL]"
                fetched_evidence.append({
                    "title": item.get("title", ""),
                    "type": item.get("type", ""),
                    "url": url,
                    "source": item.get("source", ""),
                    "committed_content_hash": item.get("hash", ""),
                    "fetched_content_hash": actual_hash,
                    "content_hash_verified": verified,
                    "appellant_relevance_claim": item.get("relevance", ""),
                    "fetched_page_content": page_text,
                })

            verified_evidence = [item for item in fetched_evidence if item["content_hash_verified"]]
            if len(verified_evidence) == 0:
                return self._json({
                    "appeal_status": "Rejected", "appeal_strength_score": 0,
                    "evidence_novelty_score": 0, "material_impact": "None",
                    "confidence_score": 100, "verdict_recommendation": "Uphold Original Verdict",
                    "reasoning": "No submitted evidence matched its committed content hash.",
                    "supporting_evidence": [], "next_action": "Stake is slashed; submit a new appeal with verifiable evidence."
                })

            prompt = f"""You are a decentralized appeals court validator for the Hapil Protocol.

An appellant is challenging an existing, finalized verdict. Decide whether the
newly submitted evidence justifies reopening the case.

ORIGINAL CASE ID: {rec.get("case_id", "")}
ORIGINAL VERDICT: {rec.get("original_verdict", "")}
AUTHORITATIVE CASE RECORD (including evidence already considered):
{json.dumps(rec.get("case_record", {}), indent=2)}
APPEAL REASON: {rec.get("appeal_reason", "")}

NEWLY SUBMITTED EVIDENCE, including the LIVE FETCHED CONTENT of each URL
(fetched_page_content). Base your judgment on fetched_page_content, not on
the appellant's own relevance claim, which may be inaccurate or misleading:
{json.dumps(verified_evidence, indent=2)}

Evaluate strictly:
1. Is the evidence genuinely NEW (not a restatement of what the original case
   already considered)?
2. Does fetched_page_content actually support the appellant's claim about it?
   If a URL failed to fetch or its content does not support the claim,
   treat that item as unverified and discount it.
3. Does the evidence MATERIALLY change the conclusion of the original verdict?
4. Does it contradict the original verdict's factual basis?

Respond ONLY with a JSON object, no markdown, using exactly this structure:
{{"appeal_status":"Accepted","appeal_strength_score":80,
"evidence_novelty_score":80,"material_impact":"High","confidence_score":85,
"verdict_recommendation":"Reopen Original Case",
"reasoning":"2-3 sentence justification.",
"supporting_evidence":["titles of evidence items that drove the decision"],
"next_action":"One sentence describing what happens next."}}

appeal_status options: Accepted, Rejected
material_impact options: None, Low, Medium, High
verdict_recommendation options: Uphold Original Verdict, Reopen Original Case, Revise Verdict
All scores are integers 0-100.

Rules:
- Every item shown has a content hash verified against its on-chain commitment.
- Accepted requires genuinely new, VERIFIED evidence AND at least Medium material impact.
- Be conservative: frivolous, redundant, unverified, or unsupported appeals must be Rejected."""

            result = gl.nondet.exec_prompt(prompt, response_format="json")
            normalised = self._normalise_review(result)
            return self._json(normalised)

        final_raw = gl.eq_principle.prompt_comparative(
            evaluate_appeal,
            principle=(
                "`appeal_status`, `stake_outcome` and `verdict_recommendation` "
                "must be exactly the same. Numeric scores may differ by at most "
                "15 points. The reasoning must reach the same conclusion."
            ),
        )

        verdict = self._normalise_review(final_raw)
        accepted = verdict["appeal_status"] == "Accepted"

        stake_amount = self._to_int(self.stakes.get(key, "0"), 0)

        if accepted:
            rec["status"] = "Accepted"
            rec["stake_outcome"] = "Returned"
            if stake_amount > 0:
                # Return the locked GEN stake to the appellant.
                # EOA recipients are external chain-layer messages. This is the
                # pinned py-genlayer SDK transfer API, finalized with the appeal.
                _EoaRecipient(Address(rec["owner"])).emit_transfer(value=u256(stake_amount))
        else:
            rec["status"] = "Rejected"
            rec["stake_outcome"] = "Slashed"
            self.slashed_pool = self.slashed_pool + u256(stake_amount)

        self.stakes[key] = "0"
        self.appeals[key] = self._json(rec)
        self.consensus[key] = self._json(verdict)

        return self._json(verdict)

    # ------------------------------------------------------------------
    # Admin
    # ------------------------------------------------------------------

    @gl.public.write
    def set_min_stake(self, min_stake: int) -> None:
        if self._sender() != self.owner.lower():
            raise gl.vm.UserError("Only owner")
        self.min_stake = u256(min_stake)
