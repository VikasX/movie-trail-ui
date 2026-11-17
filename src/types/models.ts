import type { components, paths } from './api.generated'
export type Schema = components['schemas']
export type Title = Schema['TitleSummary']
export type TitleRef = Schema['TitleRef']
export type Saved = Schema['SavedTitle']
export type Collection = Schema['Collection']
export type User = Schema['User']
export type Filters = NonNullable<
  paths['/api/v1/titles/']['get']['parameters']['query']
>
export const titleKey = (t: TitleRef) => t.media_type + ':' + t.tmdb_id
export const titlePath = (t: TitleRef) => t.media_type + '/' + t.tmdb_id
export interface LocalCollection extends Collection {
  items: TitleRef[]
  description?: string
}
export interface LibraryData {
  version: 1
  guest_id: string
  saved: Saved[]
  collections: LocalCollection[]
  recent: Schema['RecentTitle'][]
}
