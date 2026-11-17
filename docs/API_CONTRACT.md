# CineScope REST API contract

Version: **1.0.0-draft.2**. Status: proposed implementation specification, 2026-11-18.

This is a documentation-only deliverable. Existing health/sample endpoints and
Django admin remain unchanged. Every other endpoint below is planned, not deployed.
`openapi.yaml` is the machine-readable companion. This Markdown defines normative
cross-field rules, algorithms and flows that OpenAPI 3.0 cannot fully express.
Examples use fictional provider/trailer metadata; they are not promises of live availability.

## Architecture and contract conventions

React → Django REST API → TMDB → Django normalization/processing → React.
React never calls TMDB JSON APIs or handles TMDB credentials. Images may load from
TMDB's HTTPS image CDN; trailers use YouTube embeds. Google OAuth is allowed;
that is identity transport, not direct catalogue access. Email/password and guest
access are also supported.
Never proxy arbitrary user-supplied URLs. Keys and provider secrets stay server-side.
Use Django ORM and DRF; no FastAPI, SQLAlchemy, LLM, workers or Redis are required.
Pandas/NumPy are optional implementation tools only if profiling justifies them;
small bounded recommendation lists need ordinary Python, not a new service.

- Product base prefix `/api/v1/`, trailing slashes required; only the internal
  allauth callback uses `/accounts/google/login/callback/`. Count operations by method + path.
- JSON snake_case, UTF-8; dates `YYYY-MM-DD`, UTC timestamps with `Z`; UUIDs strings.
- `media_type` is exactly `movie` or `tv`; composite key `(media_type, tmdb_id)`
  everywhere, including RTK cache tags and localStorage. Never join on TMDB ID alone.
- Detail identity uses path parameters. Client UUIDs identify collections/sync jobs;
  account user IDs are integers to match the existing Django User model.
- Unknown request/query fields and invalid enums/ranges return 400. Missing versus
  null differ: PATCH omissions preserve values; null is legal only when declared.
- Default locale `en-US`, region `IN`; signed-in preference overrides apply when
  request values are absent. Original-language filtering is separate from display locale.
- All product JSON responses declare fields consistently. Null for unknown scalars;
  empty arrays for known empty lists. `metadata_status=unavailable` retains a saved
  item's last known identity/title without fabricating fresh metadata.
- GET is side-effect free. PUT saves/membership/sharing are idempotent. Explicit
  unsafe methods require CSRF even for guests (login, register, recommendation).
- Public catalogue responses do not embed watched/library status. Frontend combines
  them with its library cache/localStorage, preventing personalized shared-cache leaks.
- Standard error envelope: `error:{code,message,fields,request_id}`. No stack traces,
  credentials, provider response bodies or account existence leaks. Legacy health
  and sample errors stay as already implemented and are explicitly in OpenAPI.
- New protected APIs return JSON 401 for no session, 403 for CSRF/policy, and 404
  for another user's object. Implementation must normalize DRF SessionAuthentication's
  default unauthenticated 403 to this contract; Django admin retains its own redirects.
- HTTP statuses: 400 validation; 401 login required/invalid credentials; 403 denied;
  404 missing/private; 409 uniqueness/idempotency/quota conflict; 410 expired snapshot;
  413 oversized sync; 429 client throttle; 502 malformed upstream; 503 dependency
  unavailable or upstream throttled; 504 upstream deadline exceeded. Emit Retry-After
  for 429/503 when known. `X-Request-ID` is returned on every response.
- Success is direct resource JSON, paginated resources use count/next/previous/results/meta.
  204 and OAuth 302 intentionally have no JSON body. Clients must not parse them as JSON.

## Authentication, deployment topology and guest flow

Choose Django session cookies, not browser bearer tokens. The reliable deployment
for two separately deployed Vercel applications is a same-origin React proxy:
`https://app.example.com/api/*` and `/accounts/*` are proxied unchanged to Django,
and Google callback/return URLs use `https://app.example.com`. Preserve
Set-Cookie, Cookie, Origin, redirects and CSRF headers and never cache private
responses. Host-only session and CSRF cookies use `Path=/`, no Domain attribute,
`HttpOnly`, `Secure`, and `SameSite=Lax`; rotate the session and CSRF token after
login. If custom subdomains are used instead, Django cookies remain host-only on
`api.example.com`, with exact `CORS_ALLOWED_ORIGINS=[https://app.example.com]`,
`CORS_ALLOW_CREDENTIALS=True`, exact `CSRF_TRUSTED_ORIGINS`, and
`credentials:'include'`. Never wildcard credentialed CORS or allow
`SameSite=None` as a fix for unrelated third-party `*.vercel.app` domains.

GET `/api/v1/auth/csrf/` sets the CSRF secret cookie and returns a masked token.
Every unsafe browser request sends `X-CSRFToken` plus the CSRF cookie. Successful login rotates the token; registration and guest sync do not log in or
rotate it; bootstrap again after
OAuth before `/me/` or guest sync. Both app topologies require HTTPS, exact host
allowlists, no rewrite of internal callback locations, and private/no-store auth,
library, collection, sync and share capability responses.

Email flow: csrf → register (202, generic) → email verification link opens frontend
→ POST verify (consumes token, does not log in) → login → GET me → sync prompt.
Verification expires in 24h, reset in 1h; tokens single use and stored hashed.
Verify/reset pages must strip tokens from URLs after consumption and use no-referrer.
No public endpoint lets clients grant staff or change email verification/provider IDs.
Resend/reset requests always return the same accepted response for unknown emails.
If email delivery is unavailable, return generic 503 for every request consistently.

Google flow: csrf → POST `/api/v1/auth/oauth/start/` with provider=google → browser
navigates authorization_url → Google redirects to django-allauth's configured
`/accounts/google/login/callback/` → allauth exchanges code, validates state/identity,
creates/loads account and session → 302 allowlisted React path → csrf → me.
Use django-allauth's Google provider and state/session machinery rather than
independently implementing a callback. Local callback is exactly
`http://localhost:8000/accounts/google/login/callback/`; production uses the public
canonical Django host or same-origin proxy, with the same `/accounts/google/login/callback/`
path. `localhost` and `127.0.0.1` are not interchangeable redirect hosts.
No provider access token is stored in localStorage or returned to React.
Store provider subject + provider uniqueness. An email collision never silently links
accounts. Require existing-account login; provider linking UI/API is deferred. First
social login without a provider-verified email fails with auth=verified_email_required.
Provider denial/valid-state failures redirect with `auth=cancelled|failed|account_link_required|verified_email_required`;
invalid state returns JSON 400. Provider code/errors are not copied to frontend URLs.
Callback state is tied to the initiating browser session; no caller-controlled redirect.
Enable allauth Google PKCE and openid/email/profile scopes. The start facade delegates
authorization construction and state/session storage to allauth. No competing custom
versioned callback exists. Invalid-state JSON normalization is an integration adapter
at the existing internal callback, not a second route. Local React and Django must
both use localhost consistently (e.g. ports 5173 and 8000); local HTTP alone uses
Secure=False. Production Google redirect_uri must be registered exactly for the
chosen public canonical origin plus /accounts/google/login/callback/. Credentials
already exist; registering the final production host is still required.
For custom subdomains the initiating API host and callback host must match. For the
proxy topology both /api and /accounts must share the frontend browser host. Trust
forwarded host/protocol only if the managed proxy strips spoofed input; preserve
multiple Set-Cookie headers and use canonical external URLs. Add exact React origin
to CSRF_TRUSTED_ORIGINS even behind a proxy; same-origin calls require no CORS grant.
Keep 14-day sessions and host-only cookie domains; do not share cookies across all
subdomains or treat SameSite=None as a workaround for blocked third-party cookies.

Continue as Guest is a frontend action: no guest account, token, database session
creation or guest-login endpoint. Store library, watched state, custom collections
and recent history under a versioned localStorage namespace and random guest_id.
Use the same composite title keys and shared schemas. localStorage is untrusted.
Guests can browse, query, use mood/surprise and open public shares. Account routes
require login. Guest personalized suggestions use mood/surprise, not upload of their
whole library to an anonymous recommendation endpoint. Recent history is not synced
in v1. Login and registration never implicitly start a merge.

## Discovery semantics and honest pagination

`/metadata/` returns the full supported canonical genre taxonomy, language/region
lists and versioned mood mapping. Canonical keys resolve movie/TV genre differences:
action/adventure maps TV action-adventure, sci-fi/fantasy maps TV sci-fi-fantasy;
backend explicitly normalizes the result. **AND across every selected canonical
genre**; AND between all other filter dimensions. Unknown keys fail 400. Movie/TV genres not mapped to a selected
media type produce no candidates for that branch, never a silently ignored filter.
The canonical keys are action, adventure, animation, comedy, crime, documentary,
drama, family, fantasy, history, horror, music, mystery, romance, sci-fi, thriller,
war, western, kids, news, reality, soap, talk and war-politics. metadata returns
these exact stable keys and localized display names. Only keys represented by a
media branch's upstream genre mapping match that branch. Do not invent TV horror
or movie reality IDs. Map the current upstream genre lists by a reviewed mapping,
not translated display names. Genre changes require contract/mapping review.

For selected genres Django maps each canonical key per movie/TV branch, sends unique
mapped IDs comma-separated in with_genres (AND, not pipe/OR), then rechecks every
canonical predicate against returned genre_ids. For example animation,family with
year_from=2025 and year_to=2025 must satisfy both genres and the year. TV combined
Action & Adventure satisfies action and adventure; Sci-Fi & Fantasy satisfies sci-fi
and fantasy. Deduplicate their shared ID but retain canonical checks; no finer TV
distinction is promised. Unmappable required keys exclude that branch. Mood OR groups
are evaluated locally if a combined AND/OR expression cannot be pushed down without
weakening user filters; do not fan out into one request per genre.

Year ranges are inclusive and use primary release date/movie or first-air date/TV;
single-year UI sends equal year_from/year_to. Reject inverted year/runtime bounds.
Rating is TMDB's 0–10 score, not a user's rating. Runtime/movie is total movie minutes;
runtime/TV is median known episode runtime, rounded to nearest integer. Never sum
series length. Unknown runtime/rating/date excluded only when that dimension is filtered.
Metadata config defines supported codes; display locale is BCP-47, original_language
ISO 639-1, region uppercase ISO 3166-1 alpha-2. Adult content is excluded in all modes.

Feeds reuse GET titles: discover, trending (week), new_releases (last 90 calendar days
through current UTC date; TV uses first-air date, not new episodes), top_rated (rating
descending, minimum 200 TMDB votes). Other filters still apply. Default relevance
retains upstream feed/search order. Search q is title text; actor/director uses people
search then explicit person_id + person_role, avoiding ambiguous names. Actor uses
cast credits; director uses crew entries with exact job Director, for movies and
series-level TV credits. This does not promise exhaustive episode-director search.
q/person/feed conflicts are rejected, not ignored. All returned cards satisfy all
active filters. Unsupported TMDB filter combinations are post-filtered in Django.

**Bounded catalogue contract, optimized for Vercel:** at most two upstream list
calls and 40 source candidates per snapshot. All uses one movie page and one TV
page (20 each); a single media type or people search can use two pages. Person
credits uses one combined-credit call and retains at most 40 ranked eligible refs.
Push supported filters down first; normalize, deduplicate, enforce all predicates,
sort and freeze. Never repeatedly refill until enough matches are found. A branch
excluded by an unmappable genre does not donate its quota to the other branch.

Cards use list/cache fields; never fetch cast, trailers, availability or keywords
per card. Runtime stays nullable without an active runtime filter. Runtime-filtered
requests first select a deterministic six-candidate window (three per All branch,
six for single media) before runtime cache lookup, then hydrate only those missing
details (maximum six). Cached data avoids calls but never expands this window.
Normalize TV median episode runtime and recheck it rather than assuming TMDB's
native runtime predicate matches the median. Required unresolved data produces
503/504, not silent exclusions or a partial snapshot. Other filters run from list
fields whenever possible. The same limits apply to recommendation candidates.

candidate_limit is 40 normally, 6 for runtime filtering (20/3 if an All branch is
excluded). Count is exact only within that filtered snapshot, not the whole TMDB
catalogue. Post-filtered results can be empty even if matches exist beyond the window;
UI must say "matches in this selection". Sorting is within the window, never globally.
Subsequent pages read only the same PostgreSQL snapshot, with no upstream calls.

Cache the ordered normalized results as a five-minute immutable snapshot in shared
PostgreSQL-backed Django cache (no in-memory-only snapshot on Vercel). First page
returns snapshot UUID; next/previous absolute API URLs include snapshot, original
filters, locale, fixed page_size and page. page>1 requires snapshot. Reusing a snapshot
with different filters, identity, locale or size returns 400 snapshot_mismatch;
missing/expired snapshot returns 410 snapshot_expired and frontend restarts at page 1.
Snapshot is never permission: private pages are user-bound and public-share pages
must recheck live capability before reading cached results. count is exact in the
snapshot, not TMDB's global total; last next is null. Page beyond last is 404; empty
selection has count=0/results=[] and page 1 succeeds. Local lists use complete coverage,
candidate_limit=null. Generic PageMeta examples show discovery values; implementations
must use complete for library/recent/collection/public-share lists.

Sorting within snapshot: popularity/rating/release date/title per enum; nulls last;
ties by media_type (movie then tv), then tmdb_id ascending. Relevance for mixed media
interleaves per-media upstream ranks (movie first on tie). Recommendations return a
bounded unpaginated list. Snapshot lists represent membership/state at creation;
after a mutation RTK invalidates and requests page 1 without snapshot.

## Mood, surprise, personalization and trailer rules

Mood mapping v2 (no unvalidated keyword IDs):

- `feel_good` → Feel-Good: comedy OR animation OR family.
- `mind_bending` → Mind-Bending: sci-fi OR mystery OR fantasy.
- `dark` → Dark: thriller OR horror OR crime.
- `relaxing` → Relaxing: comedy OR family OR documentary.
- `family_night` → Family Night: animation AND family.

Active user filters are hard constraints: all selected genres must match. Four mood
groups use OR internally; Family Night requires animation AND family. The mood predicate
is ANDed with all active filters; conflicts yield an empty result, never relaxation.
Keyword lists start empty until curated TMDB IDs are verified. Mapping changes bump
mapping_version and invalidate recommendation caches. Surprise picks uniformly from
eligible bounded candidates after exclusions (not uniformly from all TMDB), returns
zero or one result. Limit must equal 1 for surprise; modes mood/personalized max 20.
Personalized requires login: count canonical genres across saved titles, watched
weight 1.5 and unwatched weight 1.0, normalize by max genre weight; candidate score
0.7*mean genre affinity + 0.2*(rating_or_zero/10) + 0.1*(popularity/max_candidate_popularity).
Generate candidates from top three weighted genres OR, intersect active filters,
exclude already saved/exclude list, sort score descending with stable composite-key
ties. Empty library uses popular_fallback explicitly. Mood uses popularity order
after matching; no inferred sensitive traits, personal ratings, likes or AI model.

Details embeds up to 20 YouTube videos. Select by requested language first then English,
official Trailer first, then other Trailer, Teaser, Clip; newest published_at first,
video ID breaks ties. Reject invalid YouTube keys and non-YouTube sites. Return ordered
list and selected_trailer_id; none means null/[] and UI "No trailer available".
Previous/Next within videos is frontend indexing; Previous/Next titles uses existing
discovery snapshot/results and fetches next page as needed. No autoplay or navigation
state stored by GET. Lists need not include trailers. Watch-provider results are
regional, distinguish not_available from temporary unavailable; they include a TMDB
availability link rather than fabricated direct streaming URLs. Display JustWatch
attribution and TMDB attribution in UI. Video/provider failure gives warning but
does not make valid core details fail. Core metadata failure cannot return fabricated
details. Cast is top 20 ordered upstream; directors all movie/series-level Director
credits, creators from TV created_by; nonapplicable fields empty/null.

## Library, collections and sharing invariants

Saving and watching are one resource, never two lists. watched=true remains in the
library. Unsave is explicit DELETE and cascades custom memberships atomically;
deleting collection/membership keeps the saved row. Adding a collection member saves
it if absent; same title may be in many collections. Account limits: 5,000 saved
titles, 100 custom collections, 500 items/custom collection. Writes that exceed these
return 409 account_limit/collection_limit without partial writes. All mutation checks
and unique constraints must be race-safe via transactions; do not fetch other owners'
objects and rely on frontend hiding controls. Return 404 for non-owned custom UUIDs.

Automatic collections are computed from the user's saved metadata, not persisted:
one `auto:genre:<canonical-key>` for each represented genre;
`auto:decade:<YYYY>` for 10-year release/first-air groups;
`auto:highly-rated` for known TMDB rating >=8.0;
`auto:movies`; `auto:tv`; and `auto:watched`.
Decade is floor(year/10)*10 (2020 means 2020–2029), using release/first-air year.
Unknown dates/ratings are excluded only from the applicable groups. Group using
stored last-known metadata; no per-library-title GET hydration. Invalidate computed
groups when saved state or metadata changes. Empty automatic
groups are omitted.
They use Collection schema kind=automatic, nullable timestamps, sharing_enabled=false,
share_url=null. Lists combine custom (updated_at desc, UUID tie) then automatic (ID asc).
Automatic items follow saved_at desc/composite tie. No rename/delete/member mutation
or sharing; return 403 immutable_collection. To publish one, user creates custom and
adds selected members through the existing membership endpoint. No hidden copy endpoint.
Empty custom collections remain visible; empty automatic collections are omitted.

Public links point to the React frontend:
`FRONTEND_PUBLIC_ORIGIN/shared/<token>`, never the Django `/api/v1/shared/{token}/`
JSON route. React calls the public JSON capability with credentials omitted and
then public title details/trailers. This origin must be configured, allowlisted and
HTTPS in production.

Shares use at least 32 cryptographically random bytes, URL-safe encoding, store SHA-256
hash for lookup. To return the same active share URL on repeated owner PUT, store the
token encrypted with a managed application key in addition to its lookup hash; this
resolves the otherwise incompatible requirements of hashed storage and recoverable URL.
Keep encryption key separate from Django SECRET_KEY with a rotation plan. Links are
capability secrets, not UUIDs; ownership is never derived from them. Public response
includes only collection name and normalized title items (no owner email, user IDs,
saved/watched state, internal collection ID or token echo). Disable/delete revokes
immediately on every page, including old snapshots; re-enable rotates token. Public
responses no-store and no-referrer; redact tokens from application/proxy analytics.
Every generated URL points to the public React /shared/<token> page. Anyone with
the link may browse the collection and play trailers using the public title-details
API and YouTube embeds without authentication. Revocation blocks collection reads,
not independently public title details. The token is never forwarded to YouTube/TMDB.

## Guest synchronization algorithm

1. Frontend keeps guest_id and per-collection client_id UUIDs, serializes a versioned
   localStorage snapshot after login, and asks Sync now / Not now. Not now keeps local
   guest data untouched and defers POST; account and guest libraries remain distinct.
2. On sync, send sync_id UUID and immutable payload; never read owner/user ID from it.
   Derive owner from session. Strict 1 MiB/500 distinct refs/20 collections/2,000 total
   memberships; max 500 each collection. Duplicate composite saved refs, duplicate
   client_ids or duplicate items in a collection return 400 before writes. Unknown
   fields, future timestamps (>5min clock skew), watched=false with nonnull watched_at,
   watched=true without watched_at, watched_at before saved_at, invalid names fail 400.
3. Resolve valid identities, using stored metadata/cache before TMDB. Definitive
   missing/adult identities are reported in rejected_titles and excluded from both
   saves and memberships; transient external errors abort the whole job with 503 and
   no writes. Limit external concurrency and overall request time; if many uncached
   titles exceed the synchronous budget return 503 sync_retry_later with Retry-After.
   Frontend can split large imports into stable batches; resubmit each with its own
   sync_id and stable collection IDs. No background processing/202 job polling in v1.
4. Atomically insert/merge accepted saves. Account watched OR guest watched wins;
   never downgrade watched during sync. Existing account saved_at is preserved;
   new rows use guest saved_at (or server now for implicit membership-only saves).
   If both watched, keep account watched_at; if only guest watched, use guest timestamp.
   Collect all unique title refs, including membership-only refs; save missing ones
   unwatched first. If a ref appears in saved_titles too, that watched state wins.
5. Map custom collection by (owner, guest_id, client_id), never by name alone.
   New name conflicts become 'Name (Imported 2)', then 3, truncating prefix to 80 chars.
   Existing mapped collection keeps account name, unions memberships; no account data
   is deleted. Do not recreate a collection deleted by owner in a replay: durable
   source mapping keeps tombstone and returns 409 sync_source_deleted; client must
   obtain explicit user action and a new collection client_id to reimport it.
6. Check quotas for the final union and lock affected resources; any quota/conflict
   aborts all writes with 409. Persist SyncReceipt unique (owner,sync_id), canonical
   request hash and result in same transaction. Same key/body for 24h replays original
   response, no repeated counts/writes; changed body 409 idempotency_conflict. Concurrent
   identical requests serialize. Receipt expiry means a later retry is a fresh merge,
   still protected by durable saved/membership/source-map uniqueness.
7. On 200 frontend clears only accepted items from the exact submitted snapshot;
   preserve new local edits and rejected titles, show errors and offer retry/discard.
   Network timeout means unknown outcome: retry identical sync_id/body, not a fresh job.
   Invalidate library/collections caches on success. Do not clear storage on 401/409/503.

Counts mean newly inserted saves, preexisting accepted saves merged (once per unique
ref), new custom collections and new membership rows; unchanged duplicates count
as merged saves but never as new rows. collection_mappings includes all accepted
source collections. An empty payload succeeds with zero counts. Recent history is
excluded. Data can include concurrent local edits: frontend freezes snapshot for
this sync job and reconciles accepted keys, rather than deleting the whole namespace.

## Persistence plan (design only; do not migrate from this document)

- **User**: existing django.contrib.auth.User integer PK retained. Username remains
  internal; authentication facade uses normalized email. Add a database UniqueConstraint
  on Lower(email) for nonempty emails via a planned compatible migration, after auditing
  existing admin users/duplicates; do not swap AUTH_USER_MODEL after deployed migrations.
  Social accounts/verified email tables may be supplied by django-allauth. Existing
  admin users need explicit email verification/bootstrap before product email login.
- **UserPreferences**: OneToOne User (cascade), display_name (80), display_language,
  region, updated_at. Keep these application fields outside staff/admin controls.
- **ExternalIdentity**: provider integration-owned model (allauth SocialAccount
  equivalent), FK User; unique(provider, provider_subject), index(user,provider).
  Never match provider identity by display name; no raw OAuth tokens unless required.
- **AccountToken**: integration-owned email verification/reset token record: user,
  purpose, token_hash unique, expires_at indexed, consumed_at; throttle issuance.
- **TitleSnapshot**: bigint PK; media_type check movie/tv, tmdb_id>0; unique pair;
  last-known normalized summary, genre keys, minimal keyword metadata, adult flag,
  fetched_at, metadata_status. Persist only titles referenced by saves/recent; do
  not mirror TMDB catalogue. Index media_type/tmdb_id, fetched_at; optional JSONB
  GIN only if profiling proves needed. TMDB metadata isn't an authorization source.
- **SavedTitle**: FK User cascade + TitleSnapshot protect; watched boolean, saved_at,
  watched_at nullable, updated_at. Unique(user,title). Check watched↔watched_at consistency;
  indexes(user,-saved_at), (user,watched,-saved_at). Limit 5,000/user transactionally.
- **Collection**: UUID PK, FK User cascade, normalized name and display name, created_at,
  updated_at. Unique(user,Lower(name)); index(user,-updated_at). Custom only; computed
  collections have no rows. Limits checked atomically, trimming applied before uniqueness.
- **CollectionMembership**: FK Collection cascade + SavedTitle cascade, added_at;
  unique(collection,saved_title), index(collection,-added_at). Same owner invariant
  requires service transaction validation (a normal Django CHECK cannot join tables).
- **PublicShare**: OneToOne Collection cascade; token_hash unique, encrypted_token,
  enabled, created_at, revoked_at. Indexed hash lookup; revoke on collection delete.
- **RecentTitle**: FK User cascade + TitleSnapshot protect, explored_at;
  unique(user,title); index(user,-explored_at); prune beyond 50. Saving is independent.
- **GuestCollectionMapping**: FK User cascade, guest_id, client_id, nullable FK Collection
  SET_NULL, deleted_at; unique(user,guest_id,client_id). Tombstones preserve deletion
  intent across retries; not a guest account or anonymous server-side library.
- **SyncReceipt**: FK User cascade, sync_id UUID, request_hash, result JSON, created_at,
  expires_at; unique(user,sync_id), expires_at index. Store summary/counts/mappings,
  not complete guest payload or credentials. Keep 24h and prune opportunistically or
  via an operator command; no background worker is needed initially.

Django auth/contenttypes/sessions/admin and third-party integration tables are
infrastructure, not new movie features. PostgreSQL-backed Django cache also holds
expiring discovery snapshots, upstream response cache, dedup locks and throttle
state; use ORM/DB-safe atomic operations for coordination, not process-local globals.
Do not claim stock DRF cache throttles are exact under races; approximate client
limits plus explicit outbound semaphore/backoff protect TMDB. Cache rows/expired
receipts may be pruned through maintenance commands outside request critical paths.
No proposed domain model or constraint is implemented by these docs.

Persist: account identity/preferences; saved/watched and dates; custom collection
membership/share state; bounded recent; sync mappings/receipts; referenced title
summary snapshots. Cache/retrieve: details, cast, videos, availability, discovery,
people search and mood candidates. Never store every TMDB title, video file, full
upstream payload forever or guest browser storage on the server before explicit sync.
Deleted TMDB titles remain removable/manageable via stored snapshots; no automatic
deletion of users' saved data. Clean unreferenced TitleSnapshots in maintenance.

## Caching, failures, rate limits and frontend behavior

Use a shared PostgreSQL-backed cache initially; Vercel filesystem and warm-process
memory are not reliable shared state. Suggested TTLs: config 24h; core details 6h;
videos 1h; regional availability 1h; feeds/search 5min; negative title 404 60s;
immutable query snapshots 5min. Include normalized query, locale, region, mapping
version and media in keys; private snapshots/recommendations additionally user ID
and library updated version. No shared cache for auth, tokens or mutable share
permissions. Do not publicly cache a secret capability response.
Refresh stored title summaries opportunistically when cache is stale; avoid unbounded
fanout on list requests. Limit hydration to candidate budget; return 503 rather than
silently drop candidates whose required filtered fields could not be loaded. A stale
last-known _saved_ summary is allowed and marked stale; fresh discovery filters may
not claim to match unavailable fields. Never cache transient 5xx as definitive 404.

httpx time budgets proposed: connect 2s, read 5s, overall endpoint 15s, at most 3
concurrent external calls per request and 8 outbound attempts maximum (normally
two list calls plus at most six runtime-detail hydration calls). A catalogue
snapshot normally considers 40 source identities and uses 300-second immutability.
Runtime-filter snapshots consider at most six identities. Follow-up pages read only
the PostgreSQL snapshot and make no upstream TMDB call. Provider 429 honors Retry-After; don't assume a fixed
TMDB quota. Shared backoff marker and cached results reduce stampedes. Initial API
throttles: public reads 60/min/IP, recommendation 10/min/IP (30/min/user signed in),
auth credential/token/OAuth initiation 5/min/IP + normalized email/provider key,
private mutations 60/min/user, sync 5/min/user, public share reads 30/min/IP. These
are proposed configurable application limits, not upstream guarantees; 429 with
Retry-After. Preserve safe serverless execution within configured Vercel timeout.

React uses RTK Query loading/isFetching states; server sends no fake loading payload
or HTTP 202 for catalogue GET. Abort/debounce search, keep previous data during
refetch but visually mark it, reset pagination on filters and avoid duplicate clicks.
200 empty list is a normal "no matches" UI, 401 prompts login, 410 restarts paging,
429 waits, 503/504 offers retry without clearing local library. Partial details use
warnings and section-level empty/unavailable states. Do not retry unsafe writes
blindly except explicitly idempotent PUT/DELETE or same sync_id/body. POST collection
creation may have unknown outcome after timeout: refetch list before recreating.
RTK composite Title tags plus Library/Collections/Recent tags must invalidate related
queries; unsave invalidates collection counts/items/automatic collections as well.
Guests' watched state overlays local data; signed-in state comes from account library.
No comparison, user rating, likes/dislikes, catalogue bulk import or AI endpoint.

## Feature-to-endpoint mapping

- Welcome/guest: local frontend state; csrf/register/login/logout/OAuth/me for accounts.
- Email safety: verify/resend/reset/confirm; provider callback establishes sessions.
- Discover and rails: metadata + titles with feed/filter/search/sort/page parameters.
- Actor/director search: people → selected ID/role → titles.
- Surprise/Mood/Personalized: one recommendations POST with mode discriminator.
- Details/trailer/streaming: one composite title details GET; previous/next is frontend
  traversal of trailers/results, not additional navigation APIs.
- Recently explored: guest localStorage; authenticated recent GET + explicit title PUT.
- Watchlist/watched: library GET, composite title PUT and DELETE.
- Custom collections: collection list/create/detail/rename/delete + member PUT/DELETE.
- Automatic collections: same collection GETs, computed read-only IDs.
- Sharing: owner sharing PUT/DELETE and unauthenticated shared-token GET.
- Guest transfer: authenticated guest-sync POST; Not now makes no request.
- Scaffold: health/database/sample endpoints retained; admin and /api/docs/ /api/schema/
  are infrastructure outside the versioned product operation count.

## Endpoint inventory and examples

Every operation below includes its authentication, input, success JSON (or explicit
bodyless response), validation, error statuses and data source. Reusable field schemas
and property examples are fully specified in openapi.yaml components.schemas.
The X-CSRFToken header requires the CSRF cookie too; it is not an auth credential.
All errors use the shared envelope except explicitly labelled legacy scaffold errors.

**Total: 36 method/path operations on 29 distinct paths: 35 versioned API operations
(32 proposed + 3 existing scaffold) and one internal django-allauth Google callback.**

- System: 3 operations.
- Metadata: 1 operations.
- Authentication: 12 operations.
- Discovery: 3 operations.
- Details: 1 operations.
- Activity: 2 operations.
- Library: 3 operations.
- Collections: 9 operations.
- Sharing: 1 operations.
- Synchronization: 1 operations.

### `GET /api/v1/health/`

Check process liveness (existing).

Authentication: public; no account session required.

Source: Django.

Request body: none.

Success: HTTP 200.

```json
{
  "status": "ok",
  "service": "CineScope API"
}
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`

### `GET /api/v1/health/db/`

Check PostgreSQL connectivity (existing).

Authentication: public; no account session required.

Source: PostgreSQL SELECT 1.

Request body: none.

Success: HTTP 200.

```json
{
  "status": "ok",
  "database": "connected"
}
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Database unavailable; legacy health envelope.. `{"status":"error","database":"unavailable"}`

### `GET /api/v1/samples/`

Read existing demonstration rows; temporary scaffold route, not product data.

Authentication: public; no account session required.

Source: PostgreSQL.

Request body: none.

Success: HTTP 200.

```json
[
  {
    "id": 1,
    "name": "CineScope database demo",
    "message": "Hello from PostgreSQL!"
  }
]
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Existing scaffold error; retained unchanged.. `{"detail":"Database unavailable."}`

### `GET /api/v1/metadata/`

Load supported filters, moods and attribution.

Authentication: public; no account session required.

Source: TMDB configuration + Python mappings.

Parameters:

- `language` (query, optional, string): TMDB-supported BCP-47 display locale; not original-language filtering. Default: `en-US`.
- `region` (query, optional, string): Supported ISO 3166-1 alpha-2 region; preferences override default when omitted. Default: `IN`.

Request body: none.

Success: HTTP 200.

```json
{
  "genres": [
    {
      "key": "drama",
      "name": "Drama"
    }
  ],
  "languages": [
    {
      "code": "en",
      "name": "English"
    }
  ],
  "regions": [
    {
      "code": "IN",
      "name": "India"
    }
  ],
  "moods": [
    {
      "key": "feel_good",
      "label": "Feel-Good",
      "genre_keys": ["comedy", "animation", "family"],
      "keyword_ids": []
    },
    {
      "key": "mind_bending",
      "label": "Mind-Bending",
      "genre_keys": ["sci-fi", "mystery", "fantasy"],
      "keyword_ids": []
    },
    {
      "key": "dark",
      "label": "Dark",
      "genre_keys": ["thriller", "horror", "crime"],
      "keyword_ids": []
    },
    {
      "key": "relaxing",
      "label": "Relaxing",
      "genre_keys": ["comedy", "family", "documentary"],
      "keyword_ids": []
    },
    {
      "key": "family_night",
      "label": "Family Night",
      "genre_keys": ["animation", "family"],
      "keyword_ids": []
    }
  ],
  "mood_mapping_version": "moods-v2",
  "attribution": {
    "tmdb_notice": "This product uses the TMDB API but is not endorsed or certified by TMDB.",
    "tmdb_url": "https://www.themoviedb.org",
    "watch_providers": "JustWatch"
  }
}
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 502: Invalid upstream response. `{"error":{"code":"upstream_invalid","message":"Invalid upstream response","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`
- HTTP 504: Upstream timeout. `{"error":{"code":"upstream_timeout","message":"Upstream timeout","fields":{},"request_id":"req-example"}}`

### `GET /api/v1/auth/csrf/`

Set CSRF cookie and return its masked token.

Authentication: public; no account session required.

Source: Django security.

Request body: none.

Success: HTTP 200.

```json
{
  "csrf_token": "example-masked-csrf-token"
}
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`

### `POST /api/v1/auth/register/`

Request email registration; send verification without creating a session.

Authentication: public; no account session required.

Source: PostgreSQL + email provider.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `Register`):

```json
{
  "email": "viewer@example.com",
  "password": "Example-only-password-2026!",
  "display_name": "Viewer"
}
```

Success: HTTP 202.

```json
{
  "detail": "If eligible, instructions have been sent."
}
```

Validation: Email is trimmed/case-normalized and unique ignoring case; validate Django password rules and 12–128 characters. Existing email returns identical 202; pending unverified user created only for new email.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `POST /api/v1/auth/login/`

Authenticate verified email account and rotate session/CSRF tokens.

Authentication: public; no account session required.

Source: PostgreSQL + Django auth.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `Login`):

```json
{
  "email": "viewer@example.com",
  "password": "Example-only-password-2026!"
}
```

Success: HTTP 200.

```json
{
  "user": {
    "id": 1,
    "email": "viewer@example.com",
    "display_name": "Viewer",
    "email_verified": true,
    "providers": ["email"],
    "preferences": {
      "language": "en-US",
      "region": "IN"
    }
  },
  "csrf_token": "example-masked-csrf-token"
}
```

Validation: Invalid credentials return generic 401; correct password with unverified email returns 403 email_unverified. Inactive account denied. Rotate session ID and CSRF token.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `POST /api/v1/auth/logout/`

Invalidate the current session and clear its cookie; guest call is harmless.

Authentication: public; no account session required.

Source: PostgreSQL sessions.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Request body: none.

Success: HTTP 204.

No response body.

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`

### `POST /api/v1/auth/email/verify/`

Consume verification token; user must then log in.

Authentication: public; no account session required.

Source: PostgreSQL + Django token validation.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `TokenInput`):

```json
{
  "token": "example-single-use-token"
}
```

Success: HTTP 200.

```json
{
  "detail": "If eligible, instructions have been sent."
}
```

Validation: Single-use token expires in 24 hours. Invalid/expired/used token returns 400 invalid_token; no session is created.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`

### `POST /api/v1/auth/email/verification/`

Request verification email with non-enumerating response.

Authentication: public; no account session required.

Source: PostgreSQL + email provider.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `EmailInput`):

```json
{
  "email": "viewer@example.com"
}
```

Success: HTTP 202.

```json
{
  "detail": "If eligible, instructions have been sent."
}
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `POST /api/v1/auth/password/reset/`

Request password reset email with non-enumerating response.

Authentication: public; no account session required.

Source: PostgreSQL + email provider.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `EmailInput`):

```json
{
  "email": "viewer@example.com"
}
```

Success: HTTP 202.

```json
{
  "detail": "If eligible, instructions have been sent."
}
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `POST /api/v1/auth/password/reset/confirm/`

Set new password and revoke existing sessions.

Authentication: public; no account session required.

Source: PostgreSQL + Django auth.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `ResetConfirm`):

```json
{
  "token": "example-single-use-token",
  "password": "Another-example-password-2026!"
}
```

Success: HTTP 200.

```json
{
  "detail": "If eligible, instructions have been sent."
}
```

Validation: Token expires in one hour and is single use; 400 invalid_token on failure. Apply registration password rules; require fresh login afterward.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`

### `POST /api/v1/auth/oauth/start/`

Create server-bound OAuth state and return provider authorization URL.

Authentication: public; no account session required.

Source: Django security + django-allauth Google configuration.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `OAuthStart`):

```json
{
  "provider": "google",
  "return_to": "/library"
}
```

Success: HTTP 200.

```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?state=example"
}
```

Validation: Provider must be configured; return_to is an enum, never an arbitrary URL. State bound to browser, single use, ten-minute expiry; authorization code flow with PKCE where supported.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

Additional rule: Delegate URL/state/session construction to django-allauth Google with PKCE. redirect_uri is the canonical public origin plus /accounts/google/login/callback/, never an independent facade callback.

### `GET /accounts/google/login/callback/`

Exchange OAuth code server-side, establish session, redirect to frontend.

Authentication: public; no account session required.

Source: django-allauth Google adapter + PostgreSQL.

Parameters:

- This framework route has no CineScope `provider` path parameter. Google supplies `state`, `code`, or `error`.
- `state` (query, required, string): Required browser-bound state.
- `code` (query, optional, string): Authorization code; mutually exclusive with error.
- `error` (query, optional, string): Provider cancellation/failure; mutually exclusive with code.

Request body: none.

Success: HTTP 302.

No JSON body. Example Location: `https://app.example.com/library?auth=success`.

Validation: Reject missing/invalid state with JSON 400; require exactly one of code/error. Valid-state provider denial redirects with auth=cancelled; exchange failures redirect auth=failed. Existing unlinked verified email redirects auth=account_link_required; never auto-link by email. No provider token appears in frontend URL.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

Additional rule: Internal allauth route, not a versioned facade. Local redirect is exactly http://localhost:8000/accounts/google/login/callback/. Start flow delegates to allauth state/session and Google PKCE; production redirect uses the registered public canonical origin. No competing callback route.

### `GET /api/v1/me/`

Get current account and preferences.

Authentication: verified active account session required.

Source: PostgreSQL.

Request body: none.

Success: HTTP 200.

```json
{
  "id": 1,
  "email": "viewer@example.com",
  "display_name": "Viewer",
  "email_verified": true,
  "providers": ["email"],
  "preferences": {
    "language": "en-US",
    "region": "IN"
  }
}
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`

### `PATCH /api/v1/me/`

Update display name and/or nested preferences.

Authentication: verified active account session required.

Source: PostgreSQL.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `UserPatch`):

```json
{
  "preferences": {
    "region": "IN"
  }
}
```

Success: HTTP 200.

```json
{
  "id": 1,
  "email": "viewer@example.com",
  "display_name": "Viewer",
  "email_verified": true,
  "providers": ["email"],
  "preferences": {
    "language": "en-US",
    "region": "IN"
  }
}
```

Validation: At least one field; reject email/id/providers/email_verified changes. Validate supported locale/region. Nested preferences PATCH preserves omitted keys.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`

### `GET /api/v1/people/`

Resolve actor/director names to explicit people IDs.

Authentication: public; no account session required.

Source: TMDB people search + Python normalization.

Parameters:

- `q` (query, required, string): Person name, trimmed.
- `language` (query, optional, string): TMDB-supported BCP-47 display locale; not original-language filtering. Default: `en-US`.
- `region` (query, optional, string): Supported ISO 3166-1 alpha-2 region; preferences override default when omitted. Default: `IN`.
- `page` (query, optional, integer): Page in the immutable result snapshot. Default: `1`.
- `page_size` (query, optional, integer): Fixed for a snapshot. Default: `20`.
- `snapshot` (query, optional, string): Returned snapshot UUID; required for page > 1. Expires after five minutes.

Request body: none.

Success: HTTP 200.

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "tmdb_id": 287,
      "name": "Brad Pitt",
      "known_for_department": "Acting",
      "profile_url": null
    }
  ],
  "meta": {
    "snapshot": "d660fc0b-25be-4ea1-9a70-d8b45b4efc24",
    "expires_at": "2026-11-18T10:05:00Z",
    "coverage": "bounded_candidates",
    "candidate_limit": 40,
    "warnings": []
  }
}
```

Validation: q required; at most two TMDB search pages (40 people) become a bounded snapshot. Select person then use titles person_id/person_role; no ambiguous automatic person selection.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 410: Expired snapshot. `{"error":{"code":"snapshot_expired","message":"Expired snapshot","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 502: Invalid upstream response. `{"error":{"code":"upstream_invalid","message":"Invalid upstream response","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`
- HTTP 504: Upstream timeout. `{"error":{"code":"upstream_timeout","message":"Upstream timeout","fields":{},"request_id":"req-example"}}`

### `GET /api/v1/titles/`

Search/filter/sort movie and TV cards or browse curated feeds.

Authentication: public; no account session required.

Source: TMDB discovery/search/credits + Python processing + cached snapshots.

Parameters:

- `media_type` (query, optional, string): All merges movie and TV candidates before sorting/pagination. Allowed: all, movie, tv. Default: `all`.
- `genres` (query, optional, array): Comma-separated canonical genre keys. **AND across every selected genre**. Backend maps to media-specific TMDB IDs.
- `year_from` (query, optional, integer): Inclusive filter; see cross-field validation rules.
- `year_to` (query, optional, integer): Inclusive filter; see cross-field validation rules.
- `min_rating` (query, optional, number): Inclusive filter; see cross-field validation rules.
- `original_language` (query, optional, string): Supported ISO 639-1 code, not display locale.
- `runtime_min` (query, optional, integer): Inclusive minutes; TV uses episode runtime, never total series length.
- `runtime_max` (query, optional, integer): Inclusive minutes; unknown runtime excluded when any runtime filter is active.
- `language` (query, optional, string): TMDB-supported BCP-47 display locale; not original-language filtering. Default: `en-US`.
- `region` (query, optional, string): Supported ISO 3166-1 alpha-2 region; preferences override default when omitted. Default: `IN`.
- `page` (query, optional, integer): Page in the immutable result snapshot. Default: `1`.
- `page_size` (query, optional, integer): Fixed for a snapshot. Default: `20`.
- `snapshot` (query, optional, string): Returned snapshot UUID; required for page > 1. Expires after five minutes.
- `q` (query, optional, string): Title text only; cannot combine with person_id or non-discover feed.
- `person_id` (query, optional, integer): Selected person ID; requires person_role; cannot combine with q/non-discover feed.
- `person_role` (query, optional, string): Required with person_id; forbidden otherwise. Allowed: actor, director.
- `feed` (query, optional, string): Reuse one discovery route for all home rails. Allowed: discover, trending, new_releases, top_rated. Default: `discover`.
- `sort` (query, optional, string): Relevance means upstream rank/interleaving; other sorts run over candidate snapshot. Allowed: relevance, popularity_desc, rating_desc, release_date_desc, release_date_asc, title_asc. Default: `relevance`.

Request body: none.

Success: HTTP 200.

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "media_type": "movie",
      "tmdb_id": 550,
      "title": "Fight Club",
      "original_title": "Fight Club",
      "overview": "A fictional example synopsis.",
      "release_date": "1999-10-15",
      "year": 1999,
      "poster_url": null,
      "backdrop_url": null,
      "genres": [
        {
          "key": "drama",
          "name": "Drama"
        }
      ],
      "original_language": "en",
      "rating": 8.4,
      "vote_count": 30000,
      "popularity": 75.0,
      "runtime_minutes": 139,
      "runtime_basis": "movie",
      "metadata_status": "available"
    }
  ],
  "meta": {
    "snapshot": "d660fc0b-25be-4ea1-9a70-d8b45b4efc24",
    "expires_at": "2026-11-18T10:05:00Z",
    "coverage": "bounded_candidates",
    "candidate_limit": 40,
    "warnings": []
  }
}
```

Validation: Apply discovery/filter/snapshot rules in Markdown. Inverted ranges, unsupported genre/language/region, illegal parameter combinations and unknown parameters return 400. All filters operate before pagination; never silently ignore unsupported criteria.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 410: Expired snapshot. `{"error":{"code":"snapshot_expired","message":"Expired snapshot","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 502: Invalid upstream response. `{"error":{"code":"upstream_invalid","message":"Invalid upstream response","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`
- HTTP 504: Upstream timeout. `{"error":{"code":"upstream_timeout","message":"Upstream timeout","fields":{},"request_id":"req-example"}}`

Additional rule: AND selected genres after per-media ID mapping; max two list calls/40 source candidates. Runtime filtering uses deterministic six-title window before cache lookup; max six hydrations. No snapshot is published on mandatory upstream failure.

### `POST /api/v1/recommendations/`

Surprise, mood or lightweight saved-metadata recommendations.

Authentication: public; no account session required.

Source: TMDB + Python; PostgreSQL saved metadata for personalized mode.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `RecommendationInput`):

```json
{
  "mode": "mood",
  "mood": "mind_bending",
  "filters": {
    "media_type": "all",
    "genres": ["drama"],
    "min_rating": 7
  },
  "exclude": [],
  "limit": 10
}
```

Success: HTTP 200.

```json
{
  "mode": "mood",
  "basis": "mood_mapping",
  "mapping_version": "moods-v2",
  "results": [
    {
      "media_type": "movie",
      "tmdb_id": 550,
      "title": "Fight Club",
      "original_title": "Fight Club",
      "overview": "A fictional example synopsis.",
      "release_date": "1999-10-15",
      "year": 1999,
      "poster_url": null,
      "backdrop_url": null,
      "genres": [
        {
          "key": "drama",
          "name": "Drama"
        }
      ],
      "original_language": "en",
      "rating": 8.4,
      "vote_count": 30000,
      "popularity": 75.0,
      "runtime_minutes": 139,
      "runtime_basis": "movie",
      "metadata_status": "available"
    }
  ],
  "warnings": []
}
```

Validation: mode=mood requires known mood; mood forbidden for other modes. Personalized requires verified login (401 otherwise). Surprise limit must be 1 (default 1 in this mode); other modes default 10. Empty matching pool returns 200 results:[]. No LLM; mapping and scoring rules below.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 502: Invalid upstream response. `{"error":{"code":"upstream_invalid","message":"Invalid upstream response","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`
- HTTP 504: Upstream timeout. `{"error":{"code":"upstream_timeout","message":"Upstream timeout","fields":{},"request_id":"req-example"}}`

Additional rule: User filters always AND; four mood groups OR, family_night AND. Keyword IDs disabled in moods-v2. Same two-list/40-candidate or six-runtime-candidate and eight-attempt ceilings as catalogue discovery.

### `GET /api/v1/titles/{media_type}/{tmdb_id}/`

Get normalized details, selected trailer list, credits and regional availability.

Authentication: public; no account session required.

Source: TMDB details/credits/videos/watch providers + Python.

Parameters:

- `media_type` (path, required, string): Composite title identity. Allowed: movie, tv.
- `tmdb_id` (path, required, integer): Positive TMDB ID.
- `language` (query, optional, string): TMDB-supported BCP-47 display locale; not original-language filtering. Default: `en-US`.
- `region` (query, optional, string): Supported ISO 3166-1 alpha-2 region; preferences override default when omitted. Default: `IN`.

Request body: none.

Success: HTTP 200.

```json
{
  "title": {
    "media_type": "movie",
    "tmdb_id": 550,
    "title": "Fight Club",
    "original_title": "Fight Club",
    "overview": "A fictional example synopsis.",
    "release_date": "1999-10-15",
    "year": 1999,
    "poster_url": null,
    "backdrop_url": null,
    "genres": [
      {
        "key": "drama",
        "name": "Drama"
      }
    ],
    "original_language": "en",
    "rating": 8.4,
    "vote_count": 30000,
    "popularity": 75.0,
    "runtime_minutes": 139,
    "runtime_basis": "movie",
    "metadata_status": "available"
  },
  "tagline": "Example tagline",
  "status": "Released",
  "number_of_seasons": null,
  "number_of_episodes": null,
  "cast": [
    {
      "person": {
        "tmdb_id": 287,
        "name": "Brad Pitt",
        "known_for_department": "Acting",
        "profile_url": null
      },
      "role": "actor",
      "character": "Tyler Durden"
    }
  ],
  "directors": [],
  "creators": [],
  "trailers": [
    {
      "id": "video-example",
      "site": "YouTube",
      "youtube_key": "abcdefghijk",
      "name": "Official trailer",
      "kind": "Trailer",
      "official": true,
      "language": "en",
      "published_at": "2026-11-18T10:00:00Z",
      "embed_url": "https://www.youtube-nocookie.com/embed/abcdefghijk",
      "watch_url": "https://www.youtube.com/watch?v=abcdefghijk"
    }
  ],
  "selected_trailer_id": "video-example",
  "availability": {
    "region": "IN",
    "status": "not_available",
    "link": null,
    "flatrate": [],
    "free": [],
    "ads": [],
    "rent": [],
    "buy": [],
    "attribution": "JustWatch"
  },
  "warnings": []
}
```

Validation: Do not confuse movie and TV IDs. Missing/adult title is 404; missing trailer/availability is a valid empty section. Core metadata failure is 502/503/504; optional section failure is 200 with warnings.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 502: Invalid upstream response. `{"error":{"code":"upstream_invalid","message":"Invalid upstream response","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`
- HTTP 504: Upstream timeout. `{"error":{"code":"upstream_timeout","message":"Upstream timeout","fields":{},"request_id":"req-example"}}`

### `GET /api/v1/me/recent/`

List up to 50 explicitly explored titles, most recent first.

Authentication: verified active account session required.

Source: PostgreSQL + metadata snapshots.

Parameters:

- `page` (query, optional, integer): Page in the immutable result snapshot. Default: `1`.
- `page_size` (query, optional, integer): Fixed for a snapshot. Default: `20`.
- `snapshot` (query, optional, string): Returned snapshot UUID; required for page > 1. Expires after five minutes.

Request body: none.

Success: HTTP 200.

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "title": {
        "media_type": "movie",
        "tmdb_id": 550,
        "title": "Fight Club",
        "original_title": "Fight Club",
        "overview": "A fictional example synopsis.",
        "release_date": "1999-10-15",
        "year": 1999,
        "poster_url": null,
        "backdrop_url": null,
        "genres": [
          {
            "key": "drama",
            "name": "Drama"
          }
        ],
        "original_language": "en",
        "rating": 8.4,
        "vote_count": 30000,
        "popularity": 75.0,
        "runtime_minutes": 139,
        "runtime_basis": "movie",
        "metadata_status": "available"
      },
      "explored_at": "2026-11-18T10:00:00Z"
    }
  ],
  "meta": {
    "snapshot": "d660fc0b-25be-4ea1-9a70-d8b45b4efc24",
    "expires_at": "2026-11-18T10:05:00Z",
    "coverage": "complete",
    "candidate_limit": null,
    "warnings": []
  }
}
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 410: Expired snapshot. `{"error":{"code":"snapshot_expired","message":"Expired snapshot","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `PUT /api/v1/me/recent/{media_type}/{tmdb_id}/`

Record deliberate title-detail/trailer exploration; upsert timestamp.

Authentication: verified active account session required.

Source: PostgreSQL + TMDB identity validation.

Parameters:

- `media_type` (path, required, string): Composite title identity. Allowed: movie, tv.
- `tmdb_id` (path, required, integer): Positive TMDB ID.
- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Request body: none.

Success: HTTP 200.

```json
{
  "title": {
    "media_type": "movie",
    "tmdb_id": 550,
    "title": "Fight Club",
    "original_title": "Fight Club",
    "overview": "A fictional example synopsis.",
    "release_date": "1999-10-15",
    "year": 1999,
    "poster_url": null,
    "backdrop_url": null,
    "genres": [
      {
        "key": "drama",
        "name": "Drama"
      }
    ],
    "original_language": "en",
    "rating": 8.4,
    "vote_count": 30000,
    "popularity": 75.0,
    "runtime_minutes": 139,
    "runtime_basis": "movie",
    "metadata_status": "available"
  },
  "explored_at": "2026-11-18T10:00:00Z"
}
```

Validation: No body. Timestamp is server-generated. Repeated calls update explored_at; keep newest 50 per user. GET details/prefetch never writes history.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 502: Invalid upstream response. `{"error":{"code":"upstream_invalid","message":"Invalid upstream response","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`
- HTTP 504: Upstream timeout. `{"error":{"code":"upstream_timeout","message":"Upstream timeout","fields":{},"request_id":"req-example"}}`

### `GET /api/v1/me/library/`

List saved titles; watched titles stay visible.

Authentication: verified active account session required.

Source: PostgreSQL + bounded metadata snapshots.

Parameters:

- `page` (query, optional, integer): Page in the immutable result snapshot. Default: `1`.
- `page_size` (query, optional, integer): Fixed for a snapshot. Default: `20`.
- `snapshot` (query, optional, string): Returned snapshot UUID; required for page > 1. Expires after five minutes.
- `watched` (query, optional, boolean): Omit for all saved titles; true/false filters watched state.
- `media_type` (query, optional, string): Optional media-type filter. Allowed: movie, tv.
- `sort` (query, optional, string): Library order. Allowed: saved_desc, title_asc. Default: `saved_desc`.

Request body: none.

Success: HTTP 200.

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "title": {
        "media_type": "movie",
        "tmdb_id": 550,
        "title": "Fight Club",
        "original_title": "Fight Club",
        "overview": "A fictional example synopsis.",
        "release_date": "1999-10-15",
        "year": 1999,
        "poster_url": null,
        "backdrop_url": null,
        "genres": [
          {
            "key": "drama",
            "name": "Drama"
          }
        ],
        "original_language": "en",
        "rating": 8.4,
        "vote_count": 30000,
        "popularity": 75.0,
        "runtime_minutes": 139,
        "runtime_basis": "movie",
        "metadata_status": "available"
      },
      "watched": true,
      "saved_at": "2026-11-18T10:00:00Z",
      "watched_at": "2026-11-18T10:00:00Z"
    }
  ],
  "meta": {
    "snapshot": "d660fc0b-25be-4ea1-9a70-d8b45b4efc24",
    "expires_at": "2026-11-18T10:05:00Z",
    "coverage": "complete",
    "candidate_limit": null,
    "warnings": []
  }
}
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 410: Expired snapshot. `{"error":{"code":"snapshot_expired","message":"Expired snapshot","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `PUT /api/v1/me/library/{media_type}/{tmdb_id}/`

Create or update saved/watched state idempotently.

Authentication: verified active account session required.

Source: PostgreSQL + TMDB validation on first save.

Parameters:

- `media_type` (path, required, string): Composite title identity. Allowed: movie, tv.
- `tmdb_id` (path, required, integer): Positive TMDB ID.
- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `SavedTitleInput`):

```json
{
  "watched": true
}
```

Success: HTTP 200.

```json
{
  "title": {
    "media_type": "movie",
    "tmdb_id": 550,
    "title": "Fight Club",
    "original_title": "Fight Club",
    "overview": "A fictional example synopsis.",
    "release_date": "1999-10-15",
    "year": 1999,
    "poster_url": null,
    "backdrop_url": null,
    "genres": [
      {
        "key": "drama",
        "name": "Drama"
      }
    ],
    "original_language": "en",
    "rating": 8.4,
    "vote_count": 30000,
    "popularity": 75.0,
    "runtime_minutes": 139,
    "runtime_basis": "movie",
    "metadata_status": "available"
  },
  "watched": true,
  "saved_at": "2026-11-18T10:00:00Z",
  "watched_at": "2026-11-18T10:00:00Z"
}
```

Validation: watched required, true/false. Return 200 for create/update to preserve idempotent client flow. watched_at assigned on false→true, preserved on repeated true, cleared on false. Unavailable existing title can still change watched state. Account quota returns 409 account_limit.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 409: Conflict. `{"error":{"code":"conflict","message":"Conflict","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 502: Invalid upstream response. `{"error":{"code":"upstream_invalid","message":"Invalid upstream response","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`
- HTTP 504: Upstream timeout. `{"error":{"code":"upstream_timeout","message":"Upstream timeout","fields":{},"request_id":"req-example"}}`

### `DELETE /api/v1/me/library/{media_type}/{tmdb_id}/`

Explicitly unsave title and remove its custom collection memberships.

Authentication: verified active account session required.

Source: PostgreSQL transaction.

Parameters:

- `media_type` (path, required, string): Composite title identity. Allowed: movie, tv.
- `tmdb_id` (path, required, integer): Positive TMDB ID.
- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Request body: none.

Success: HTTP 204.

No response body.

Validation: Missing own saved row is a successful no-op. Does not erase exploration history. Watching alone never removes a title.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `GET /api/v1/me/collections/`

List owned custom and computed automatic collections.

Authentication: verified active account session required.

Source: PostgreSQL saved metadata + Python rules.

Parameters:

- `page` (query, optional, integer): Page in the immutable result snapshot. Default: `1`.
- `page_size` (query, optional, integer): Fixed for a snapshot. Default: `20`.
- `snapshot` (query, optional, string): Returned snapshot UUID; required for page > 1. Expires after five minutes.

Request body: none.

Success: HTTP 200.

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "0b04e83e-f4ef-44db-840e-9b494f007c99",
      "kind": "custom",
      "name": "Weekend picks",
      "item_count": 1,
      "created_at": "2026-11-18T10:00:00Z",
      "updated_at": "2026-11-18T10:00:00Z",
      "sharing_enabled": false,
      "share_url": null
    }
  ],
  "meta": {
    "snapshot": "d660fc0b-25be-4ea1-9a70-d8b45b4efc24",
    "expires_at": "2026-11-18T10:05:00Z",
    "coverage": "complete",
    "candidate_limit": null,
    "warnings": []
  }
}
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 410: Expired snapshot. `{"error":{"code":"snapshot_expired","message":"Expired snapshot","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `POST /api/v1/me/collections/`

Create custom collection.

Authentication: verified active account session required.

Source: PostgreSQL.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `CollectionInput`):

```json
{
  "name": "Weekend picks"
}
```

Success: HTTP 201.

```json
{
  "id": "0b04e83e-f4ef-44db-840e-9b494f007c99",
  "kind": "custom",
  "name": "Weekend picks",
  "item_count": 1,
  "created_at": "2026-11-18T10:00:00Z",
  "updated_at": "2026-11-18T10:00:00Z",
  "sharing_enabled": false,
  "share_url": null
}
```

Validation: Trim name; case-insensitive uniqueness among user's custom collections; max 100 custom collections/account. Duplicate name or account limit returns 409.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 409: Conflict. `{"error":{"code":"conflict","message":"Conflict","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `GET /api/v1/me/collections/{collection_id}/`

Read owned custom or computed automatic collection and paginated items.

Authentication: verified active account session required.

Source: PostgreSQL + Python.

Parameters:

- `collection_id` (path, required, string): Owned custom UUID or auto:genre:<key>/auto:watched. Automatic IDs are GET-only.
- `page` (query, optional, integer): Page in the immutable result snapshot. Default: `1`.
- `page_size` (query, optional, integer): Fixed for a snapshot. Default: `20`.
- `snapshot` (query, optional, string): Returned snapshot UUID; required for page > 1. Expires after five minutes.

Request body: none.

Success: HTTP 200.

```json
{
  "collection": {
    "id": "0b04e83e-f4ef-44db-840e-9b494f007c99",
    "kind": "custom",
    "name": "Weekend picks",
    "item_count": 1,
    "created_at": "2026-11-18T10:00:00Z",
    "updated_at": "2026-11-18T10:00:00Z",
    "sharing_enabled": false,
    "share_url": null
  },
  "items": {
    "count": 1,
    "next": null,
    "previous": null,
    "results": [
      {
        "title": {
          "media_type": "movie",
          "tmdb_id": 550,
          "title": "Fight Club",
          "original_title": "Fight Club",
          "overview": "A fictional example synopsis.",
          "release_date": "1999-10-15",
          "year": 1999,
          "poster_url": null,
          "backdrop_url": null,
          "genres": [
            {
              "key": "drama",
              "name": "Drama"
            }
          ],
          "original_language": "en",
          "rating": 8.4,
          "vote_count": 30000,
          "popularity": 75.0,
          "runtime_minutes": 139,
          "runtime_basis": "movie",
          "metadata_status": "available"
        },
        "added_at": "2026-11-18T10:00:00Z"
      }
    ],
    "meta": {
      "snapshot": "d660fc0b-25be-4ea1-9a70-d8b45b4efc24",
      "expires_at": "2026-11-18T10:05:00Z",
      "coverage": "complete",
      "candidate_limit": null,
      "warnings": []
    }
  }
}
```

Validation: Unknown query/body fields are rejected; apply global limits.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 410: Expired snapshot. `{"error":{"code":"snapshot_expired","message":"Expired snapshot","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `PATCH /api/v1/me/collections/{collection_id}/`

Rename owned custom collection.

Authentication: verified active account session required.

Source: PostgreSQL.

Parameters:

- `collection_id` (path, required, string): Owned custom UUID or auto:genre:<key>/auto:watched. Automatic IDs are GET-only.
- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `CollectionInput`):

```json
{
  "name": "Weekend picks"
}
```

Success: HTTP 200.

```json
{
  "id": "0b04e83e-f4ef-44db-840e-9b494f007c99",
  "kind": "custom",
  "name": "Weekend picks",
  "item_count": 1,
  "created_at": "2026-11-18T10:00:00Z",
  "updated_at": "2026-11-18T10:00:00Z",
  "sharing_enabled": false,
  "share_url": null
}
```

Validation: Same name rules as creation. Automatic IDs return 403 immutable_collection; other owner's UUID returns 404.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 409: Conflict. `{"error":{"code":"conflict","message":"Conflict","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `DELETE /api/v1/me/collections/{collection_id}/`

Delete custom collection and revoke its public link; retain saved titles.

Authentication: verified active account session required.

Source: PostgreSQL transaction.

Parameters:

- `collection_id` (path, required, string): Owned custom UUID or auto:genre:<key>/auto:watched. Automatic IDs are GET-only.
- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Request body: none.

Success: HTTP 204.

No response body.

Validation: Existing owned custom UUID required; missing/not-owned 404. Automatic IDs return 403 immutable_collection.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `PUT /api/v1/me/collections/{collection_id}/items/{media_type}/{tmdb_id}/`

Idempotently add title to custom collection, saving it if needed.

Authentication: verified active account session required.

Source: PostgreSQL transaction + TMDB on first save.

Parameters:

- `collection_id` (path, required, string): Owned custom UUID or auto:genre:<key>/auto:watched. Automatic IDs are GET-only.
- `media_type` (path, required, string): Composite title identity. Allowed: movie, tv.
- `tmdb_id` (path, required, integer): Positive TMDB ID.
- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Request body: none.

Success: HTTP 200.

```json
{
  "title": {
    "media_type": "movie",
    "tmdb_id": 550,
    "title": "Fight Club",
    "original_title": "Fight Club",
    "overview": "A fictional example synopsis.",
    "release_date": "1999-10-15",
    "year": 1999,
    "poster_url": null,
    "backdrop_url": null,
    "genres": [
      {
        "key": "drama",
        "name": "Drama"
      }
    ],
    "original_language": "en",
    "rating": 8.4,
    "vote_count": 30000,
    "popularity": 75.0,
    "runtime_minutes": 139,
    "runtime_basis": "movie",
    "metadata_status": "available"
  },
  "added_at": "2026-11-18T10:00:00Z"
}
```

Validation: No body. Requires owned custom collection; auto IDs 403. One membership per title/collection. First save uses watched=false; never reset existing watched state. Max 500 items/collection, otherwise 409.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 502: Invalid upstream response. `{"error":{"code":"upstream_invalid","message":"Invalid upstream response","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`
- HTTP 504: Upstream timeout. `{"error":{"code":"upstream_timeout","message":"Upstream timeout","fields":{},"request_id":"req-example"}}`
- HTTP 409: Collection item limit reached.. `{"error":{"code":"collection_limit","message":"Collection item limit reached.","fields":{},"request_id":"req-example"}}`

### `DELETE /api/v1/me/collections/{collection_id}/items/{media_type}/{tmdb_id}/`

Remove custom collection membership while retaining saved title.

Authentication: verified active account session required.

Source: PostgreSQL.

Parameters:

- `collection_id` (path, required, string): Owned custom UUID or auto:genre:<key>/auto:watched. Automatic IDs are GET-only.
- `media_type` (path, required, string): Composite title identity. Allowed: movie, tv.
- `tmdb_id` (path, required, integer): Positive TMDB ID.
- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Request body: none.

Success: HTTP 204.

No response body.

Validation: Existing owned custom collection required; missing membership no-op 204. Automatic IDs return 403.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `PUT /api/v1/me/collections/{collection_id}/sharing/`

Enable read-only capability link; reuse current link if already enabled.

Authentication: verified active account session required.

Source: PostgreSQL + secure random token.

Parameters:

- `collection_id` (path, required, string): Owned custom UUID or auto:genre:<key>/auto:watched. Automatic IDs are GET-only.
- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Request body: none.

Success: HTTP 200.

```json
{
  "enabled": true,
  "url": "https://app.example.com/shared/EXAMPLE_TOKEN_0123456789abcdef0123456789abcd"
}
```

Validation: Owned custom collection only; automatic 403. No body. Return token only to owner; persist token hash. Enabling after revocation creates a new token.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `DELETE /api/v1/me/collections/{collection_id}/sharing/`

Immediately revoke current public capability link.

Authentication: verified active account session required.

Source: PostgreSQL.

Parameters:

- `collection_id` (path, required, string): Owned custom UUID or auto:genre:<key>/auto:watched. Automatic IDs are GET-only.
- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Request body: none.

Success: HTTP 204.

No response body.

Validation: Owned custom collection required; already disabled no-op 204. Automatic IDs 403. Old link remains invalid if later re-enabled.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `GET /api/v1/shared/{token}/`

Read public collection by unguessable capability; no account data disclosed.

Authentication: public; no account session required.

Source: PostgreSQL + snapshots.

Parameters:

- `token` (path, required, string): Opaque 256-bit share capability, never logged.
- `page` (query, optional, integer): Page in the immutable result snapshot. Default: `1`.
- `page_size` (query, optional, integer): Fixed for a snapshot. Default: `20`.
- `snapshot` (query, optional, string): Returned snapshot UUID; required for page > 1. Expires after five minutes.

Request body: none.

Success: HTTP 200.

```json
{
  "name": "Weekend picks",
  "items": {
    "count": 1,
    "next": null,
    "previous": null,
    "results": [
      {
        "title": {
          "media_type": "movie",
          "tmdb_id": 550,
          "title": "Fight Club",
          "original_title": "Fight Club",
          "overview": "A fictional example synopsis.",
          "release_date": "1999-10-15",
          "year": 1999,
          "poster_url": null,
          "backdrop_url": null,
          "genres": [
            {
              "key": "drama",
              "name": "Drama"
            }
          ],
          "original_language": "en",
          "rating": 8.4,
          "vote_count": 30000,
          "popularity": 75.0,
          "runtime_minutes": 139,
          "runtime_basis": "movie",
          "metadata_status": "available"
        },
        "added_at": "2026-11-18T10:00:00Z"
      }
    ],
    "meta": {
      "snapshot": "d660fc0b-25be-4ea1-9a70-d8b45b4efc24",
      "expires_at": "2026-11-18T10:05:00Z",
      "coverage": "complete",
      "candidate_limit": null,
      "warnings": []
    }
  }
}
```

Validation: Invalid/revoked/deleted capability returns same generic 404. Malformed token also 404 (not validation 400). Check capability on every page before snapshot lookup. No write endpoint.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 404: Not found. `{"error":{"code":"not_found","message":"Not found","fields":{},"request_id":"req-example"}}`
- HTTP 410: Expired snapshot. `{"error":{"code":"snapshot_expired","message":"Expired snapshot","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`

### `POST /api/v1/me/guest-sync/`

Merge validated guest library and collections without deleting account data.

Authentication: verified active account session required.

Source: PostgreSQL atomic merge + TMDB for unknown identities.

Parameters:

- `X-CSRFToken` (header, required, string): Masked token from GET /auth/csrf/; required with CSRF cookie on unsafe browser requests.

Required JSON body (schema `SyncInput`):

```json
{
  "sync_id": "d660fc0b-25be-4ea1-9a70-d8b45b4efc24",
  "guest_id": "0b04e83e-f4ef-44db-840e-9b494f007c99",
  "saved_titles": [
    {
      "media_type": "movie",
      "tmdb_id": 550,
      "watched": true,
      "saved_at": "2026-11-18T10:00:00Z",
      "watched_at": "2026-11-18T10:00:00Z"
    }
  ],
  "collections": [
    {
      "client_id": "0b04e83e-f4ef-44db-840e-9b494f007c99",
      "name": "Weekend picks",
      "items": [
        {
          "media_type": "movie",
          "tmdb_id": 550
        }
      ]
    }
  ]
}
```

Success: HTTP 200.

```json
{
  "sync_id": "d660fc0b-25be-4ea1-9a70-d8b45b4efc24",
  "saved_created": 1,
  "saved_merged": 0,
  "collections_created": 1,
  "memberships_created": 1,
  "collection_mappings": [
    {
      "client_id": "0b04e83e-f4ef-44db-840e-9b494f007c99",
      "collection_id": "0b04e83e-f4ef-44db-840e-9b494f007c99"
    }
  ],
  "rejected_titles": []
}
```

Validation: Idempotency key is sync_id in body; same user/key/body replays original result for 24h, changed body returns 409. Max 1 MiB body, 500 distinct titles, 20 collections, 2000 memberships. Full merge rules below. Reject malformed/duplicate payload entries with 400; transient upstream failures abort writes with 503.

Possible errors:

- HTTP 400: Invalid input. `{"error":{"code":"validation_error","message":"Invalid input","fields":{},"request_id":"req-example"}}`
- HTTP 401: Authentication required. `{"error":{"code":"authentication_required","message":"Authentication required","fields":{},"request_id":"req-example"}}`
- HTTP 403: CSRF or policy denied. `{"error":{"code":"permission_denied","message":"CSRF or policy denied","fields":{},"request_id":"req-example"}}`
- HTTP 409: Conflict. `{"error":{"code":"conflict","message":"Conflict","fields":{},"request_id":"req-example"}}`
- HTTP 413: Request too large. `{"error":{"code":"payload_too_large","message":"Request too large","fields":{},"request_id":"req-example"}}`
- HTTP 429: Rate limited. `{"error":{"code":"rate_limited","message":"Rate limited","fields":{},"request_id":"req-example"}}`
- HTTP 502: Invalid upstream response. `{"error":{"code":"upstream_invalid","message":"Invalid upstream response","fields":{},"request_id":"req-example"}}`
- HTTP 503: Service unavailable. `{"error":{"code":"service_unavailable","message":"Service unavailable","fields":{},"request_id":"req-example"}}`
- HTTP 504: Upstream timeout. `{"error":{"code":"upstream_timeout","message":"Upstream timeout","fields":{},"request_id":"req-example"}}`

## Implementation boundaries and decisions still requiring product/deployment input

Frontend and backend agents should implement from the same versioned pair of files;
schema changes require changing both in one review. Before implementation, agree on:

1. **Authentication topology**: finalize the frontend/backend custom domains or
   same-origin proxy and deploy the exact django-allauth Google callback. Session,
   CSRF and CORS configuration must match the chosen topology. Transactional email
   service/sender remains unconfigured.
2. **Discovery coverage**: accept the explicit bounded candidate semantics or fund
   a broader indexed/search solution in a new contract version; runtime-filtered
   results deliberately have a six-title candidate window. This v1 does not
   claim exact global combined TMDB pagination. Episode-director search is excluded.
3. **Mood curation/automatic collections**: finalized mappings and genre/decade/rating/media/watched grouping
   are executable defaults for coding agents; design screenshots were not supplied,
   the five specified UI labels and automatic categories are fixed. Keyword IDs are
   explicitly empty/disabled until verified and versioned; do not invent IDs.
4. **Sharing URL and encryption**: choose public frontend route/hostname and secret
   management mechanism for encrypted recoverable share tokens; API capability format
   and immediate revocation are fixed. Never place encryption key in Git.
5. **Existing User email migration**: audit deployed superuser/email data and decide
   verification bootstrap. Retain deployed User model; do not casually reset migrations.
6. **Sync size/latency**: verify synchronous request budget with realistic guest imports
   before launch. Contract defines bounded retry/batch behavior; no job system is implied.
7. **TMDB use/attribution**: obtain appropriate API access, confirm commercial terms and
   place TMDB/JustWatch notices in the finalized UI. No external credentials are needed
   to consume these planning documents, and no live catalogue calls were made here.

These are recorded decisions/configuration inputs, not permission gates for this
documentation task. No implementation files, models, migrations, installed dependencies,
database contents, deployed routes or auth settings were changed for this deliverable.

## Primary references consulted

- [TMDB movie discovery](https://developer.themoviedb.org/reference/discover-movie)
  and [TV discovery](https://developer.themoviedb.org/reference/discover-tv): upstream
  filter capabilities and movie/TV differences. The combined snapshot protocol is
  CineScope's proposed processing layer, not a TMDB feature.
- [TMDB combined person credits](https://developer.themoviedb.org/reference/person-combined-credits):
  resolves selected people to movie and TV credits; role semantics are defined above.
- [TMDB watch providers](https://developer.themoviedb.org/reference/movie-watch-providers):
  regional provider data, link limitations and JustWatch attribution.
- [TMDB rate limiting](https://developer.themoviedb.org/docs/rate-limiting): respect 429;
  upstream limits may change. Application throttles/timeouts here are proposed defaults.
- [TMDB FAQ](https://developer.themoviedb.org/docs/faq): availability and commercial access.
- [django-allauth headless specification](https://docs.allauth.org/en/latest/headless/openapi-specification/):
  browser session/CSRF and provider-redirect patterns. CineScope facade remains separate.

- [allauth Google configuration](https://docs.allauth.org/en/latest/socialaccount/providers/google.html): conventional callback path.
- [Django CSRF](https://docs.djangoproject.com/en/6.0/ref/csrf/): token/cookie and Origin validation.
