# Phase 6 — local semantic and hybrid search

Implemented and verified in the local fictional-data installation. Phase 7 draft
summaries and Phase 8 release/recovery work remain pending. This phase retrieves
source passages; it does not generate clinical answers, diagnoses or summaries.

## Staff workflow

Open **Search documents** and choose a method:

- **Hybrid** combines the existing keyword rules with similar-meaning passages.
- **Semantic** retrieves similar-meaning passages using local embeddings.
- **Keyword** preserves literal text, patient/record-number, tooth-number and existing
  clinic-term synonym matching. It does not require the model reader.

The existing document type, completeness status, patient, recorded-date and tooth
filters apply to every method. Empty text lists permitted active records without
calling the model. Date and tooth constraints should use filters; this phase is not
a general natural-language filter parser. English is the embedding model's intended
language; existing clinic-term synonyms remain in keyword/hybrid search. Tagalog
semantic quality has not been established.

Results show the matched transcription passage or document metadata, match method,
source document version and revision. Opening a result navigates to that document.
Handwriting remains explicitly unscored and pending staff review where applicable;
retrieval does not approve a transcription or establish completeness or validity.
Unverified saved text can be searched, so check the source and its review status.

The UI debounces typing and clears old results when a new search begins. **Search
again** retries without changing text. If local inference is unavailable or busy,
hybrid search explicitly reports keyword-only fallback. Semantic-only search reports
an error instead of presenting keyword results as semantic success. No success is
claimed for a failed or partial stale-source search.

## Index and ranking

The pinned model is `sentence-transformers/all-MiniLM-L6-v2`, revision
`1110a243fdf4706b3f48f1d95db1a4f5529b4d41`. It runs locally with attention-mask mean
pooling and normalized 384-dimensional vectors. Model files are hash-checked at
startup and loaded locally; no clinic text is sent to an external embedding API.
The private CPU reader introduced for handwriting now also provides embeddings.

PostgreSQL remains version 17 on Alpine, with the existing database volume. A
custom image adds **pgvector 0.8.7**. Additive migration 6 enables the extension and
creates `search_chunks` with an actual `vector(384)` column. The runtime database
role can maintain this derived cache but retains no audit/workflow/OCR/handwriting
history modification privileges.

Current document metadata and saved transcription text are indexed. Raw model
handwriting suggestions, clinical translations and historical versions are not
added as independent searchable content. Text is split into overlapping windows
of at most 200 characters, advancing by 160 characters, with source field and
character offsets retained. Transcription snippets are exact slices of the saved
source; metadata snippets use a labeled representation of the document's fields.

The first semantic search indexes permitted/filter-matching records as needed.
Chunks are cached with document revision, source fingerprint and model identity.
Changes to source text, title/type, patient linkage, file/version, metadata or revision
require fresh indexing before reuse. The model call is followed by revision checks;
results captured before a concurrent source/archive/permission change are omitted
and the UI asks for a retry. Stale excerpts are not returned as current evidence.

PostgreSQL performs exact cosine-distance ranking, restricted to the permitted
document IDs. The highest-ranked chunk represents each document. Semantic candidates
below cosine similarity **0.40** are excluded. This is a conservative heuristic,
not calibrated relevance, OCR confidence or an accuracy percentage. Hybrid mode
uses reciprocal-rank fusion of keyword and semantic result lists. Results are
limited to 30 by default (API maximum 100). Similar wording does not establish a
clinical fact or guarantee that every returned document satisfies an implied intent.

The implementation uses exact scans for this small installation, not approximate
HNSW/IVFFlat indexes. Index warming is synchronous and can make first searches
slower; only one semantic/indexing request runs per API process. Embedding calls are
batched, input/token bounds checked, and documents with over 200,000 characters in
an indexed field explicitly require keyword fallback. Large-clinic scalability and
broader retrieval-quality benchmarking remain future validation work.

## Permissions and evidence

The server applies active-record, role and explicit filters **before** selecting
source text for embeddings. Front Desk cannot cause clinical records to be embedded
through this endpoint or retrieve their snippets/vectors. Existing clinical vectors
may remain in the private database cache after earlier authorized indexing, but
they are not included in a restricted user's vector query. Archived records are
excluded even for administrators; use the existing archive workflow separately.

After inference, the server rechecks current document revision, archive state,
read permission and the staff account's enabled status/role. Source attribution
uses current serialized records and stored exact chunk offsets. The client does
not provide authorization scopes or ranking vectors. The legacy authenticated
`/api/documents/search` keyword endpoint remains available; the new UI uses
`POST /api/search` with query, filters, mode and limit.

Search vectors are derived data stored in the existing database, not a substitute
for original files or backups. They can be rebuilt. Do not delete database volumes
to rebuild the index. Existing original-file encryption and account/session controls
remain unchanged. This work does not establish production security or compliance.

## Setup and preservation

Before changing the PostgreSQL image, a consistent private database snapshot was
saved at `work/phase6-safety/before-pgvector.dump`. Existing file volumes and keys
were not changed. That snapshot alone is not a complete original-file/key backup
or a clean-machine restore drill; those remain Phase 8 requirements.

The embedding artifact is intentionally ignored by Git. On a prepared installation:

```powershell
.venv/Scripts/python.exe scripts/configure-semantic.py
docker compose --profile semantic up --build -d
```

The setup script downloads only fixed public model files and verifies their pinned
SHA-256 values. Existing differing files are not silently overwritten. It does not
modify clinic settings or upload data. This installation already has the private
reader credential and trained handwriting artifact from Phase 5; the shared reader
requires those assets as documented in `PHASE5_HANDWRITING.md`. The `handwriting`
profile also starts the same reader. Never regenerate `.env`, credentials or file
encryption keys to troubleshoot a missing model, and never delete named volumes.

The optional reader has no published network port, uses a private API credential,
read-only local model mounts, offline loading and existing container resource limits.
Normal searches need no runtime internet connection. Query text and document text
are not written into reader logs or exported for training.

## Validation

- **71 backend tests passed**, no skips, in the packaged OCR environment. New
  coverage includes nonliteral semantic retrieval, filters, excerpt offsets and
  version/revision attribution, index reuse/refresh, permissions before embedding,
  archive exclusion, concurrent source changes, low-similarity rejection, query
  bounds, CSRF, busy-reader behavior and explicit failure fallback.
- The isolated SQLite suite uses deterministic test embeddings and exact cosine
  ranking. Actual PostgreSQL pgvector and model behavior were checked separately
  against the deployed installation; fake vectors are not used by the app.
- Real offline model check: `root canal` had cosine similarity about 0.545 with an
  endodontic-treatment passage versus 0.093 with an unrelated appointment passage.
  This is a fictional smoke test, not a broad retrieval-accuracy benchmark.
- Deployed Edge acceptance passed: real semantic retrieval of a fictional
  endodontic passage without a literal root-canal match; keyword separation;
  source/offset/version attribution; correct document navigation; re-indexing after
  edited text removed the old match; desktop and 390px mobile layouts without
  browser exceptions.
- An actual reader stop/restart verified explicit hybrid keyword fallback and
  semantic-only error handling. The private reader is running again.
- Type checking, production Docker build and whitespace checks passed. PostgreSQL
  has migration 6, extension 0.8.7 and persisted `vector(384)` chunks. Original hashes,
  protected history privileges and the original 12 patients were verified afterward.
- Fictional acceptance records are archived. The temporary verification account is
  disabled and sessions revoked. Only the existing clinic administrator remains
  enabled; its password was not used or changed. No real dental photos/labels were
  imported into the application or used for model training in this phase.

One upstream Starlette/httpx deprecation warning remains. The source is maintained on `codex/phase4-review-validity`. No PR, merge or
real-data release has been performed. Local model weights, clinic data and private
settings are excluded from Git.

Implementation references: [pgvector](https://github.com/pgvector/pgvector),
[MiniLM model card and pooling example](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2),
and [Sentence Transformers semantic-search documentation](https://www.sbert.net/examples/sentence_transformer/applications/semantic-search/README.html).
