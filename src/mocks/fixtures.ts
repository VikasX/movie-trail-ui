/**
 * Representative movie/TV records and metadata used by the demo API.
 * The exported arrays follow the API response types, so components can consume mock and live results alike.
 * Poster links come from design assets. The small trailer map contains the available fixture video IDs.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in compile-time types from `@/types/models`.
import type { Title, Schema } from '@/types/models'
// Keep `titles` as an array containing these ordered values.
export const titles: Title[] = [
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 693134,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'Dune: Part Two',
    // The title in its original language.
    original_title: 'Dune: Part Two',
    // The release year, which can be missing.
    year: 2024,
    // The catalogue rating, which may be unavailable.
    rating: 8.2,
    // The running time in minutes, when known.
    runtime_minutes: 166,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'sci-fi'`.
        key: 'sci-fi',
        // Set the `name` field to the text `'Sci-Fi'`.
        name: 'Sci-Fi',
      },
      {
        // Set the `key` field to the text `'adventure'`.
        key: 'adventure',
        // Set the `name` field to the text `'Adventure'`.
        name: 'Adventure',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'Paul Atreides joins the Fremen and confronts a future that only he can see.',
    // The portrait image URL used on cards.
    poster_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCBmDo_OGYXhJlMe3-7O9C0gfbasIBAjLxplaj4vriA3xwF1RXFXtQbG3sNnkuGh3Cw4CdZetvmsiDj-Sqt4N90UE8zAoegDnqGhvJOzcP2FeMqdTLfmcWldyOgutHC1ZJbGUdm663Z_Bx15Tmv8ggXArjre0yP4Db08NzmefLQZyje7VWjCBIhfl1qRxG85PNZR2UE16JxKEcJcwjyGSD4lrdH8dTSChMV4lF8knA',
    // The wide image URL used for title backgrounds.
    backdrop_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCBmDo_OGYXhJlMe3-7O9C0gfbasIBAjLxplaj4vriA3xwF1RXFXtQbG3sNnkuGh3Cw4CdZetvmsiDj-Sqt4N90UE8zAoegDnqGhvJOzcP2FeMqdTLfmcWldyOgutHC1ZJbGUdm663Z_Bx15Tmv8ggXArjre0yP4Db08NzmefLQZyje7VWjCBIhfl1qRxG85PNZR2UE16JxKEcJcwjyGSD4lrdH8dTSChMV4lF8knA',
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2024-06-01',
    // The number of votes behind the rating.
    vote_count: 2500,
    // The catalogue popularity value used for ranking.
    popularity: 100,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 666277,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'Past Lives',
    // The title in its original language.
    original_title: 'Past Lives',
    // The release year, which can be missing.
    year: 2023,
    // The catalogue rating, which may be unavailable.
    rating: 7.8,
    // The running time in minutes, when known.
    runtime_minutes: 106,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'drama'`.
        key: 'drama',
        // Set the `name` field to the text `'Drama'`.
        name: 'Drama',
      },
      {
        // Set the `key` field to the text `'romance'`.
        key: 'romance',
        // Set the `name` field to the text `'Romance'`.
        name: 'Romance',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'Two childhood friends reunite in New York and consider the lives they could have shared.',
    // The portrait image URL used on cards.
    poster_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBxMOF2s6gUvtu5Xv8DWhT0sKt1G0wr70G1QqLC54t4ajzlcSAkEz771s_JKJoMcL_UBScud_9ENAUvTTB7wU5aLFxVT1hsNtjCF-Mu04tNDvjyqkoklDKUx3OTYeHAHsYIe0mXl7i1M-ek4jdzCK3ncOxeCMoNFf5w96xiEfBgz7DAkbjIwlaKscRZQxe_9hLxV9fmXdGUc6bDUaehPs3cxkBhVb6BeOIqcF13Eg4',
    // The wide image URL used for title backgrounds.
    backdrop_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBxMOF2s6gUvtu5Xv8DWhT0sKt1G0wr70G1QqLC54t4ajzlcSAkEz771s_JKJoMcL_UBScud_9ENAUvTTB7wU5aLFxVT1hsNtjCF-Mu04tNDvjyqkoklDKUx3OTYeHAHsYIe0mXl7i1M-ek4jdzCK3ncOxeCMoNFf5w96xiEfBgz7DAkbjIwlaKscRZQxe_9hLxV9fmXdGUc6bDUaehPs3cxkBhVb6BeOIqcF13Eg4',
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2023-06-01',
    // The number of votes behind the rating.
    vote_count: 2800,
    // The catalogue popularity value used for ranking.
    popularity: 97,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 157336,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'Interstellar',
    // The title in its original language.
    original_title: 'Interstellar',
    // The release year, which can be missing.
    year: 2014,
    // The catalogue rating, which may be unavailable.
    rating: 8.4,
    // The running time in minutes, when known.
    runtime_minutes: 169,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'sci-fi'`.
        key: 'sci-fi',
        // Set the `name` field to the text `'Sci-Fi'`.
        name: 'Sci-Fi',
      },
      {
        // Set the `key` field to the text `'drama'`.
        key: 'drama',
        // Set the `name` field to the text `'Drama'`.
        name: 'Drama',
      },
      {
        // Set the `key` field to the text `'adventure'`.
        key: 'adventure',
        // Set the `name` field to the text `'Adventure'`.
        name: 'Adventure',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'A team of explorers travels beyond this galaxy to find a future for humanity.',
    // The portrait image URL used on cards.
    poster_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwkOnBC6jfVz84N7PDovJdVtG2smSiE1KEz5cK_DY7bLoc8G3t8OnrYFIIX2A2S0FygW7pZ8F-lcaaoRGzXcyLKC0xYhy8lWYFPoTxjiTq3_7k768f209XbWpPKYMqCIijMqkFju1vnNScv-D1eE0PaIBF6tk6XQV4hs26xK96sLtY0CK6YeBpHFf12HTk86UToK7RHDsfVaw9BkAaWsPAwudeSGcXW3TUKoqeJQs',
    // The wide image URL used for title backgrounds.
    backdrop_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwkOnBC6jfVz84N7PDovJdVtG2smSiE1KEz5cK_DY7bLoc8G3t8OnrYFIIX2A2S0FygW7pZ8F-lcaaoRGzXcyLKC0xYhy8lWYFPoTxjiTq3_7k768f209XbWpPKYMqCIijMqkFju1vnNScv-D1eE0PaIBF6tk6XQV4hs26xK96sLtY0CK6YeBpHFf12HTk86UToK7RHDsfVaw9BkAaWsPAwudeSGcXW3TUKoqeJQs',
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2014-06-01',
    // The number of votes behind the rating.
    vote_count: 3100,
    // The catalogue popularity value used for ranking.
    popularity: 94,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 872585,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'Oppenheimer',
    // The title in its original language.
    original_title: 'Oppenheimer',
    // The release year, which can be missing.
    year: 2023,
    // The catalogue rating, which may be unavailable.
    rating: 8.1,
    // The running time in minutes, when known.
    runtime_minutes: 180,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'drama'`.
        key: 'drama',
        // Set the `name` field to the text `'Drama'`.
        name: 'Drama',
      },
      {
        // Set the `key` field to the text `'history'`.
        key: 'history',
        // Set the `name` field to the text `'History'`.
        name: 'History',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'Physicist J. Robert Oppenheimer leads a project that changes the world.',
    // The portrait image URL used on cards.
    poster_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwrd7Ctyqxg3NZWA3JaH3L23bxiCcH9J5lJjIE9Mug0rMhZUXy0vkBGSN0mP4eDUTH0zWITrNrHgFlBUrFcDk5BZ9RYgoF7n28THzTKgEmCj5AXDk6xmbMSJFf69Vw3Kw8zCyVjCGGpHDKr4BazN1V8LfMIN-xh3a77NtZ8Xp7-Yhu3GgzTEdUZT5L_lg5_qOJP4xlk5_ElDI1iLu6XukpJzFDRUhrkuNscOGJXw8',
    // The wide image URL used for title backgrounds.
    backdrop_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwrd7Ctyqxg3NZWA3JaH3L23bxiCcH9J5lJjIE9Mug0rMhZUXy0vkBGSN0mP4eDUTH0zWITrNrHgFlBUrFcDk5BZ9RYgoF7n28THzTKgEmCj5AXDk6xmbMSJFf69Vw3Kw8zCyVjCGGpHDKr4BazN1V8LfMIN-xh3a77NtZ8Xp7-Yhu3GgzTEdUZT5L_lg5_qOJP4xlk5_ElDI1iLu6XukpJzFDRUhrkuNscOGJXw8',
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2023-06-01',
    // The number of votes behind the rating.
    vote_count: 3400,
    // The catalogue popularity value used for ranking.
    popularity: 91,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 335984,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'Blade Runner 2049',
    // The title in its original language.
    original_title: 'Blade Runner 2049',
    // The release year, which can be missing.
    year: 2017,
    // The catalogue rating, which may be unavailable.
    rating: 8,
    // The running time in minutes, when known.
    runtime_minutes: 164,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'sci-fi'`.
        key: 'sci-fi',
        // Set the `name` field to the text `'Sci-Fi'`.
        name: 'Sci-Fi',
      },
      {
        // Set the `key` field to the text `'mystery'`.
        key: 'mystery',
        // Set the `name` field to the text `'Mystery'`.
        name: 'Mystery',
      },
      {
        // Set the `key` field to the text `'thriller'`.
        key: 'thriller',
        // Set the `name` field to the text `'Thriller'`.
        name: 'Thriller',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'An officer uncovers a secret that could reshape a divided future.',
    // The portrait image URL used on cards.
    poster_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDBsQyo1Z1h2rgQ_B-Ge58N1XlQDNzxQNUrp8yGEq25R6MkTHTK6YxfsV-a6gTPYeRmTAK57uN6UdHRyrgGE9h-FhRK0uMZYKRMlKD4JGrZCim0FzEa4Ot02gruwwWT19aWRWy4RbZLCcsw5OEY_6ej3_wEN5TIbAmPPWydnjVBPPiS5tBaxdj4g9z9M9B-hJz7VHSfb95xBlG1YAyBq13V2IxhbntcWpY2UK2rMrg',
    // The wide image URL used for title backgrounds.
    backdrop_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDBsQyo1Z1h2rgQ_B-Ge58N1XlQDNzxQNUrp8yGEq25R6MkTHTK6YxfsV-a6gTPYeRmTAK57uN6UdHRyrgGE9h-FhRK0uMZYKRMlKD4JGrZCim0FzEa4Ot02gruwwWT19aWRWy4RbZLCcsw5OEY_6ej3_wEN5TIbAmPPWydnjVBPPiS5tBaxdj4g9z9M9B-hJz7VHSfb95xBlG1YAyBq13V2IxhbntcWpY2UK2rMrg',
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2017-06-01',
    // The number of votes behind the rating.
    vote_count: 3700,
    // The catalogue popularity value used for ranking.
    popularity: 88,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 329865,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'Arrival',
    // The title in its original language.
    original_title: 'Arrival',
    // The release year, which can be missing.
    year: 2016,
    // The catalogue rating, which may be unavailable.
    rating: 7.9,
    // The running time in minutes, when known.
    runtime_minutes: 116,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'sci-fi'`.
        key: 'sci-fi',
        // Set the `name` field to the text `'Sci-Fi'`.
        name: 'Sci-Fi',
      },
      {
        // Set the `key` field to the text `'drama'`.
        key: 'drama',
        // Set the `name` field to the text `'Drama'`.
        name: 'Drama',
      },
      {
        // Set the `key` field to the text `'mystery'`.
        key: 'mystery',
        // Set the `name` field to the text `'Mystery'`.
        name: 'Mystery',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'A linguist searches for understanding when visitors arrive on Earth.',
    // The portrait image URL used on cards.
    poster_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAdugdmaTAoAPPBZcwOlRnVWF6XAyuMBXBgEDLDG_Eb5zSPvmPkYQoNrKBArSr_9DruFkGByx8qKBW7qC5OtAdmDhf8XtRd6cuL_EyiQz0XXTZaH0_prb1qeO7-wUZUV40QdKcp75Xoz7DJykxktHBzoOwoHiVxONQXB4uL0GJ4rfMuIO5f34M9P9rhxXYoQWYo1gyv50BdHNxJwEAaU97jkKlKWODLCOgOVFF0fEQ',
    // The wide image URL used for title backgrounds.
    backdrop_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAdugdmaTAoAPPBZcwOlRnVWF6XAyuMBXBgEDLDG_Eb5zSPvmPkYQoNrKBArSr_9DruFkGByx8qKBW7qC5OtAdmDhf8XtRd6cuL_EyiQz0XXTZaH0_prb1qeO7-wUZUV40QdKcp75Xoz7DJykxktHBzoOwoHiVxONQXB4uL0GJ4rfMuIO5f34M9P9rhxXYoQWYo1gyv50BdHNxJwEAaU97jkKlKWODLCOgOVFF0fEQ',
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2016-06-01',
    // The number of votes behind the rating.
    vote_count: 4000,
    // The catalogue popularity value used for ranking.
    popularity: 85,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 9693,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'Children of Men',
    // The title in its original language.
    original_title: 'Children of Men',
    // The release year, which can be missing.
    year: 2006,
    // The catalogue rating, which may be unavailable.
    rating: 7.6,
    // The running time in minutes, when known.
    runtime_minutes: 109,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'sci-fi'`.
        key: 'sci-fi',
        // Set the `name` field to the text `'Sci-Fi'`.
        name: 'Sci-Fi',
      },
      {
        // Set the `key` field to the text `'thriller'`.
        key: 'thriller',
        // Set the `name` field to the text `'Thriller'`.
        name: 'Thriller',
      },
      {
        // Set the `key` field to the text `'drama'`.
        key: 'drama',
        // Set the `name` field to the text `'Drama'`.
        name: 'Drama',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'An unlikely protector escorts a young woman through a world without hope.',
    // The portrait image URL used on cards.
    poster_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDzD9jBi_Qu1vsK04JPAdIuLbeOlvWBIIO4oZK9yqxVATRE6Lv4XaGjDf3ho8zAoGmIpTsdrJN65O1mV--Vry91d66rUJmZjP8onNWZhCDovzuHdhUgPEFLhyNM7WqmV3r_Zki2VPem_tqswGvjBb4ec3ogMDyyxeSAy88NZPXIHA2k6C0Djs5mzADIlr1En4vbo-NgtrL9eJvECFi4eJnUkY5Wx-WSCCHEP04AP6g',
    // The wide image URL used for title backgrounds.
    backdrop_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDzD9jBi_Qu1vsK04JPAdIuLbeOlvWBIIO4oZK9yqxVATRE6Lv4XaGjDf3ho8zAoGmIpTsdrJN65O1mV--Vry91d66rUJmZjP8onNWZhCDovzuHdhUgPEFLhyNM7WqmV3r_Zki2VPem_tqswGvjBb4ec3ogMDyyxeSAy88NZPXIHA2k6C0Djs5mzADIlr1En4vbo-NgtrL9eJvECFi4eJnUkY5Wx-WSCCHEP04AP6g',
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2006-06-01',
    // The number of votes behind the rating.
    vote_count: 4300,
    // The catalogue popularity value used for ranking.
    popularity: 82,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 545611,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'Everything Everywhere All at Once',
    // The title in its original language.
    original_title: 'Everything Everywhere All at Once',
    // The release year, which can be missing.
    year: 2022,
    // The catalogue rating, which may be unavailable.
    rating: 7.8,
    // The running time in minutes, when known.
    runtime_minutes: 139,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'sci-fi'`.
        key: 'sci-fi',
        // Set the `name` field to the text `'Sci-Fi'`.
        name: 'Sci-Fi',
      },
      {
        // Set the `key` field to the text `'adventure'`.
        key: 'adventure',
        // Set the `name` field to the text `'Adventure'`.
        name: 'Adventure',
      },
      {
        // Set the `key` field to the text `'comedy'`.
        key: 'comedy',
        // Set the `name` field to the text `'Comedy'`.
        name: 'Comedy',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'A family’s ordinary life becomes an extraordinary journey across possible worlds.',
    // The portrait image URL used on cards.
    poster_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBh7TK_48evz5kSxyJaDJLz_XIQJepJjz7bC_RCYlypHQUtnQkq2XjbHjiILc8Fio64ER-AchSCcz7jPLS0ZNnV86cWvPqA_uluTMvzjvTNREsNQk6dUJmXnsf97-my15g7FGkxgBEhGk6EoScOqoVnBd_OFtMG2RIOO9OGjMyP0aKapoUMWj2qy8ODDf2AyekJuPSg1uNbsI9gvW-3dt0O4eUu_6-e1ZPrx_mO-MM',
    // The wide image URL used for title backgrounds.
    backdrop_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBh7TK_48evz5kSxyJaDJLz_XIQJepJjz7bC_RCYlypHQUtnQkq2XjbHjiILc8Fio64ER-AchSCcz7jPLS0ZNnV86cWvPqA_uluTMvzjvTNREsNQk6dUJmXnsf97-my15g7FGkxgBEhGk6EoScOqoVnBd_OFtMG2RIOO9OGjMyP0aKapoUMWj2qy8ODDf2AyekJuPSg1uNbsI9gvW-3dt0O4eUu_6-e1ZPrx_mO-MM',
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2022-06-01',
    // The number of votes behind the rating.
    vote_count: 4600,
    // The catalogue popularity value used for ranking.
    popularity: 79,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 508883,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'The Boy and the Heron',
    // The title in its original language.
    original_title: 'The Boy and the Heron',
    // The release year, which can be missing.
    year: 2023,
    // The catalogue rating, which may be unavailable.
    rating: 7.5,
    // The running time in minutes, when known.
    runtime_minutes: 124,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'animation'`.
        key: 'animation',
        // Set the `name` field to the text `'Animation'`.
        name: 'Animation',
      },
      {
        // Set the `key` field to the text `'family'`.
        key: 'family',
        // Set the `name` field to the text `'Family'`.
        name: 'Family',
      },
      {
        // Set the `key` field to the text `'fantasy'`.
        key: 'fantasy',
        // Set the `name` field to the text `'Fantasy'`.
        name: 'Fantasy',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'A young boy steps into an imaginative world between life and loss.',
    // The portrait image URL used on cards.
    poster_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDmNnldIdTqoDXU0_OHQT-bXSq0lishEEpoqP6Atrdk-CCrz51Q978BBNKJsni5OYji2n-5E7tDmvpV2JXr9qYj9FObW5s5tNK-REB7vEeWyTR8v8rjcfMSqli2eI2hWFAaM3pBcV0_crIvZgVpZ4wZFNcpjpw0-L0Hu_vRmAdN0wzfNfxhk0WL00Lk6Qt9bvIT6lfRm3h3-LhJ-QCKCsgc8Gqn0KrM4akKyR00u_Y',
    // The wide image URL used for title backgrounds.
    backdrop_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDmNnldIdTqoDXU0_OHQT-bXSq0lishEEpoqP6Atrdk-CCrz51Q978BBNKJsni5OYji2n-5E7tDmvpV2JXr9qYj9FObW5s5tNK-REB7vEeWyTR8v8rjcfMSqli2eI2hWFAaM3pBcV0_crIvZgVpZ4wZFNcpjpw0-L0Hu_vRmAdN0wzfNfxhk0WL00Lk6Qt9bvIT6lfRm3h3-LhJ-QCKCsgc8Gqn0KrM4akKyR00u_Y',
    // The original-language code used by the API.
    original_language: 'ja',
    // The release date supplied by the catalogue.
    release_date: '2023-06-01',
    // The number of votes behind the rating.
    vote_count: 4900,
    // The catalogue popularity value used for ranking.
    popularity: 76,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 46648,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'tv',
    // The title record or display title used by this object.
    title: 'True Detective',
    // The title in its original language.
    original_title: 'True Detective',
    // The release year, which can be missing.
    year: 2014,
    // The catalogue rating, which may be unavailable.
    rating: 8.3,
    // The running time in minutes, when known.
    runtime_minutes: 60,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'episode',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'crime'`.
        key: 'crime',
        // Set the `name` field to the text `'Crime'`.
        name: 'Crime',
      },
      {
        // Set the `key` field to the text `'drama'`.
        key: 'drama',
        // Set the `name` field to the text `'Drama'`.
        name: 'Drama',
      },
      {
        // Set the `key` field to the text `'mystery'`.
        key: 'mystery',
        // Set the `name` field to the text `'Mystery'`.
        name: 'Mystery',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'Detectives follow complicated cases that test their convictions.',
    // The portrait image URL used on cards.
    poster_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuACDCJq4he5wz6WCze1jm1XOyNQHQ-DApiRc_0og2A9B13GtKosR6wLmAqgRM4Mv5f5zdYoZvGNUSmNmv9ZxxBd2hlrzcOOyAKJWjQ1aiROTrTHvG6gOCWpJScok6QmmGTJLacrbC9jsWLFkwObD4FBFXcD3uMEsr-2rutx4vYJTq13sAQ7WY6ZgHolYNLSjOdaKUUqUPF1rVGRDUFtIVtc8B2wkonuMJw3TJwcj3c',
    // The wide image URL used for title backgrounds.
    backdrop_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuACDCJq4he5wz6WCze1jm1XOyNQHQ-DApiRc_0og2A9B13GtKosR6wLmAqgRM4Mv5f5zdYoZvGNUSmNmv9ZxxBd2hlrzcOOyAKJWjQ1aiROTrTHvG6gOCWpJScok6QmmGTJLacrbC9jsWLFkwObD4FBFXcD3uMEsr-2rutx4vYJTq13sAQ7WY6ZgHolYNLSjOdaKUUqUPF1rVGRDUFtIVtc8B2wkonuMJw3TJwcj3c',
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2014-06-01',
    // The number of votes behind the rating.
    vote_count: 5200,
    // The catalogue popularity value used for ranking.
    popularity: 73,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 1399,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'tv',
    // The title record or display title used by this object.
    title: 'Game of Thrones',
    // The title in its original language.
    original_title: 'Game of Thrones',
    // The release year, which can be missing.
    year: 2011,
    // The catalogue rating, which may be unavailable.
    rating: 8.4,
    // The running time in minutes, when known.
    runtime_minutes: 57,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'episode',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'fantasy'`.
        key: 'fantasy',
        // Set the `name` field to the text `'Fantasy'`.
        name: 'Fantasy',
      },
      {
        // Set the `key` field to the text `'drama'`.
        key: 'drama',
        // Set the `name` field to the text `'Drama'`.
        name: 'Drama',
      },
      {
        // Set the `key` field to the text `'adventure'`.
        key: 'adventure',
        // Set the `name` field to the text `'Adventure'`.
        name: 'Adventure',
      },
    ],
    // The synopsis shown in title details.
    overview: 'Great houses compete for power in a vast and changing kingdom.',
    // The portrait image URL used on cards.
    poster_url: null,
    // The wide image URL used for title backgrounds.
    backdrop_url: null,
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2011-06-01',
    // The number of votes behind the rating.
    vote_count: 5500,
    // The catalogue popularity value used for ranking.
    popularity: 70,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 1396,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'tv',
    // The title record or display title used by this object.
    title: 'Breaking Bad',
    // The title in its original language.
    original_title: 'Breaking Bad',
    // The release year, which can be missing.
    year: 2008,
    // The catalogue rating, which may be unavailable.
    rating: 8.9,
    // The running time in minutes, when known.
    runtime_minutes: 47,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'episode',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'crime'`.
        key: 'crime',
        // Set the `name` field to the text `'Crime'`.
        name: 'Crime',
      },
      {
        // Set the `key` field to the text `'drama'`.
        key: 'drama',
        // Set the `name` field to the text `'Drama'`.
        name: 'Drama',
      },
      {
        // Set the `key` field to the text `'thriller'`.
        key: 'thriller',
        // Set the `name` field to the text `'Thriller'`.
        name: 'Thriller',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'A chemistry teacher’s choices draw his family into a dangerous new life.',
    // The portrait image URL used on cards.
    poster_url: null,
    // The wide image URL used for title backgrounds.
    backdrop_url: null,
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2008-06-01',
    // The number of votes behind the rating.
    vote_count: 5800,
    // The catalogue popularity value used for ranking.
    popularity: 67,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 66732,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'tv',
    // The title record or display title used by this object.
    title: 'Stranger Things',
    // The title in its original language.
    original_title: 'Stranger Things',
    // The release year, which can be missing.
    year: 2016,
    // The catalogue rating, which may be unavailable.
    rating: 8.6,
    // The running time in minutes, when known.
    runtime_minutes: 50,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'episode',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'sci-fi'`.
        key: 'sci-fi',
        // Set the `name` field to the text `'Sci-Fi'`.
        name: 'Sci-Fi',
      },
      {
        // Set the `key` field to the text `'mystery'`.
        key: 'mystery',
        // Set the `name` field to the text `'Mystery'`.
        name: 'Mystery',
      },
      {
        // Set the `key` field to the text `'drama'`.
        key: 'drama',
        // Set the `name` field to the text `'Drama'`.
        name: 'Drama',
      },
    ],
    // The synopsis shown in title details.
    overview: 'Friends investigate strange events in their small Indiana town.',
    // The portrait image URL used on cards.
    poster_url: null,
    // The wide image URL used for title backgrounds.
    backdrop_url: null,
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '2016-06-01',
    // The number of votes behind the rating.
    vote_count: 6100,
    // The catalogue popularity value used for ranking.
    popularity: 64,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 238,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'The Godfather',
    // The title in its original language.
    original_title: 'The Godfather',
    // The release year, which can be missing.
    year: 1972,
    // The catalogue rating, which may be unavailable.
    rating: 8.7,
    // The running time in minutes, when known.
    runtime_minutes: 175,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'crime'`.
        key: 'crime',
        // Set the `name` field to the text `'Crime'`.
        name: 'Crime',
      },
      {
        // Set the `key` field to the text `'drama'`.
        key: 'drama',
        // Set the `name` field to the text `'Drama'`.
        name: 'Drama',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'A family’s legacy draws its reluctant youngest son into organized crime.',
    // The portrait image URL used on cards.
    poster_url: null,
    // The wide image URL used for title backgrounds.
    backdrop_url: null,
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '1972-06-01',
    // The number of votes behind the rating.
    vote_count: 6400,
    // The catalogue popularity value used for ranking.
    popularity: 61,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 550,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'Fight Club',
    // The title in its original language.
    original_title: 'Fight Club',
    // The release year, which can be missing.
    year: 1999,
    // The catalogue rating, which may be unavailable.
    rating: 8.4,
    // The running time in minutes, when known.
    runtime_minutes: 139,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'drama'`.
        key: 'drama',
        // Set the `name` field to the text `'Drama'`.
        name: 'Drama',
      },
      {
        // Set the `key` field to the text `'thriller'`.
        key: 'thriller',
        // Set the `name` field to the text `'Thriller'`.
        name: 'Thriller',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'Two strangers form a secret club that grows beyond their control.',
    // The portrait image URL used on cards.
    poster_url: null,
    // The wide image URL used for title backgrounds.
    backdrop_url: null,
    // The original-language code used by the API.
    original_language: 'en',
    // The release date supplied by the catalogue.
    release_date: '1999-06-01',
    // The number of votes behind the rating.
    vote_count: 6700,
    // The catalogue popularity value used for ranking.
    popularity: 58,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
  {
    // The numeric TMDB identifier, paired with media_type to identify a title.
    tmdb_id: 129,
    // Whether the identity belongs to a movie or a TV series.
    media_type: 'movie',
    // The title record or display title used by this object.
    title: 'Spirited Away',
    // The title in its original language.
    original_title: 'Spirited Away',
    // The release year, which can be missing.
    year: 2001,
    // The catalogue rating, which may be unavailable.
    rating: 8.5,
    // The running time in minutes, when known.
    runtime_minutes: 125,
    // Whether the running time describes a movie, an episode, or an unknown basis.
    runtime_basis: 'movie',
    // The genre values used for filtering or display.
    genres: [
      {
        // Set the `key` field to the text `'animation'`.
        key: 'animation',
        // Set the `name` field to the text `'Animation'`.
        name: 'Animation',
      },
      {
        // Set the `key` field to the text `'family'`.
        key: 'family',
        // Set the `name` field to the text `'Family'`.
        name: 'Family',
      },
      {
        // Set the `key` field to the text `'fantasy'`.
        key: 'fantasy',
        // Set the `name` field to the text `'Fantasy'`.
        name: 'Fantasy',
      },
    ],
    // The synopsis shown in title details.
    overview:
      'A girl must find courage in an enchanted world to save her parents.',
    // The portrait image URL used on cards.
    poster_url: null,
    // The wide image URL used for title backgrounds.
    backdrop_url: null,
    // The original-language code used by the API.
    original_language: 'ja',
    // The release date supplied by the catalogue.
    release_date: '2001-06-01',
    // The number of votes behind the rating.
    vote_count: 7000,
    // The catalogue popularity value used for ranking.
    popularity: 55,
    // Whether the catalogue metadata is available, stale, or unavailable.
    metadata_status: 'available',
  },
]
// Keep `trailerKeys` as an object whose named fields are explained below.
export const trailerKeys: Record<number, string> = {
  // Set the `157336` field to the text `'zSWdZVtXT7E'`.
  157336: 'zSWdZVtXT7E',
  // Set the `693134` field to the text `'U2Qp5pL3ovA'`.
  693134: 'U2Qp5pL3ovA',
  // Set the `872585` field to the text `'uYPbbksJxIg'`.
  872585: 'uYPbbksJxIg',
}
// Keep `metadata` as an object whose named fields are explained below.
export const metadata: Schema['Metadata'] = {
  // The genre values used for filtering or display.
  genres:
    'action adventure animation comedy crime documentary drama family fantasy history horror music mystery romance sci-fi thriller war western kids news reality soap talk war-politics'
      .split(' ')
      .map((key) => ({
        // Use the existing `key` variable as the field with the same name.
        key,
        // Set the `name` field to a choice between two values based on `key === 'sci-fi'`.
        name:
          key === 'sci-fi'
            ? 'Sci-Fi'
            : key.charAt(0).toUpperCase() + key.slice(1),
      })),
  // Set the `languages` field to an array containing these ordered values.
  languages: [
    { code: 'en', name: 'English' },
    { code: 'ja', name: 'Japanese' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ko', name: 'Korean' },
    { code: 'fr', name: 'French' },
  ],
  // Set the `regions` field to an array containing these ordered values.
  regions: [
    { code: 'IN', name: 'India' },
    { code: 'US', name: 'United States' },
  ],
  // Set the `moods` field to an array containing these ordered values.
  moods: [
    {
      // Set the `key` field to the text `'feel_good'`.
      key: 'feel_good',
      // Set the `label` field to the text `'Feel-Good'`.
      label: 'Feel-Good',
      // Set the `genre_keys` field to an array containing these ordered values.
      genre_keys: ['comedy', 'animation', 'family'],
      // Set the `keyword_ids` field to an empty array, ready to collect items.
      keyword_ids: [],
    },
    {
      // Set the `key` field to the text `'mind_bending'`.
      key: 'mind_bending',
      // Set the `label` field to the text `'Mind-Bending'`.
      label: 'Mind-Bending',
      // Set the `genre_keys` field to an array containing these ordered values.
      genre_keys: ['sci-fi', 'mystery', 'fantasy'],
      // Set the `keyword_ids` field to an empty array, ready to collect items.
      keyword_ids: [],
    },
    {
      // Set the `key` field to the text `'dark'`.
      key: 'dark',
      // Set the `label` field to the text `'Dark'`.
      label: 'Dark',
      // Set the `genre_keys` field to an array containing these ordered values.
      genre_keys: ['thriller', 'horror', 'crime'],
      // Set the `keyword_ids` field to an empty array, ready to collect items.
      keyword_ids: [],
    },
    {
      // Set the `key` field to the text `'relaxing'`.
      key: 'relaxing',
      // Set the `label` field to the text `'Relaxing'`.
      label: 'Relaxing',
      // Set the `genre_keys` field to an array containing these ordered values.
      genre_keys: ['comedy', 'family', 'documentary'],
      // Set the `keyword_ids` field to an empty array, ready to collect items.
      keyword_ids: [],
    },
    {
      // Set the `key` field to the text `'family_night'`.
      key: 'family_night',
      // Set the `label` field to the text `'Family Night'`.
      label: 'Family Night',
      // Set the `genre_keys` field to an array containing these ordered values.
      genre_keys: ['animation', 'family'],
      // Set the `keyword_ids` field to an empty array, ready to collect items.
      keyword_ids: [],
    },
  ],
  // Set the `mood_mapping_version` field to the text `'moods-v2'`.
  mood_mapping_version: 'moods-v2',
  // Set the `attribution` field to an object whose named fields are explained below.
  attribution: {
    // Set the `tmdb_notice` field to the text `'This product uses the TMDB API but is not endorsed or certified by TMDB.'`.
    tmdb_notice:
      'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    // Set the `tmdb_url` field to the text `'https://www.themoviedb.org'`.
    tmdb_url: 'https://www.themoviedb.org',
    // Set the `watch_providers` field to the text `'JustWatch'`.
    watch_providers: 'JustWatch',
  },
}
