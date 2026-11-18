/**
 * Short, application-friendly names for types generated from the Django API contract.
 * Types describe allowed shapes while editing and compiling. They do not validate incoming JSON at runtime.
 * This file also defines the browser-only guest library and composite movie/TV identity helpers.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in compile-time types from `./api.generated`.
import type { components, paths } from './api.generated'
// components.schemas is the generated OpenAPI collection of response/request type definitions.
// Define `Schema` as a compile-time type alias for the shape below; it creates no runtime object.
export type Schema = components['schemas']
// Define `Title` as a compile-time type alias for the shape below; it creates no runtime object.
export type Title = Schema['TitleSummary']
// Define `TitleRef` as a compile-time type alias for the shape below; it creates no runtime object.
export type TitleRef = Schema['TitleRef']
// Define `Saved` as a compile-time type alias for the shape below; it creates no runtime object.
export type Saved = Schema['SavedTitle']
// Define `Collection` as a compile-time type alias for the shape below; it creates no runtime object.
export type Collection = Schema['Collection']
// Define `User` as a compile-time type alias for the shape below; it creates no runtime object.
export type User = Schema['User']
// Read the titles query type from its generated path definition, then remove the optional undefined case.
// Define `Filters` as a compile-time type alias for the shape below; it creates no runtime object.
export type Filters = NonNullable<
  paths['/api/v1/titles/']['get']['parameters']['query']
>
// Example movie:550. A movie and TV series can share a numeric ID, so both parts identify the record.
// Keep `titleKey` as a callback that runs when it is called.
export const titleKey = (t: TitleRef) => t.media_type + ':' + t.tmdb_id
// Example movie/550. This version of the identity is suitable for a Django endpoint path.
// Keep `titlePath` as a callback that runs when it is called.
export const titlePath = (t: TitleRef) => t.media_type + '/' + t.tmdb_id
// Extra browser-only fields used while rendering and editing guest collections.
// Describe the fields allowed on `LocalCollection`; TypeScript checks callers against this shape.
export interface LocalCollection extends Collection {
  // The member records contained in this group or paginated response. Its type is `TitleRef[]`.
  items: TitleRef[]
  // The descriptive text associated with this value. The ? makes this field optional. Its type is `string`.
  description?: string
}
// The complete persisted guest document. recent is separate from saved because opening a trailer does not save it.
// Describe the fields allowed on `LibraryData`; TypeScript checks callers against this shape.
export interface LibraryData {
  // The local storage format version, used when validating the saved document. Its type is `1`.
  version: 1
  // The identity of this browser guest library. Its type is `string`.
  guest_id: string
  // The saved-title rows kept for this guest library. Its type is `Saved[]`.
  saved: Saved[]
  // The collections belonging to this data object. Its type is `LocalCollection[]`.
  collections: LocalCollection[]
  // Recently explored titles, maintained separately from saved titles. Its type is `Schema['RecentTitle'][]`.
  recent: Schema['RecentTitle'][]
}
