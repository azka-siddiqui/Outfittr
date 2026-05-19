import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// D1 is SQLite. We use text ids (uuids) generated in the Worker so inserts
// don't need a round-trip to read the id back. Timestamps are unix millis.

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    handle: text("handle").notNull().unique(),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    avatarKey: text("avatar_key"),
    // Private accounts require an approved follow request to view outfits.
    isPrivate: integer("is_private", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    handleIdx: index("users_handle_idx").on(t.handle),
  })
);

export const collections = sqliteTable(
  "collections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("collections_user_idx").on(t.userId),
  })
);

export const outfits = sqliteTable(
  "outfits",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    collectionId: text("collection_id").references(() => collections.id, {
      onDelete: "set null",
    }),
    // R2 object keys for the original photo and an optional AI cutout.
    photoKey: text("photo_key").notNull(),
    cutoutKey: text("cutout_key"),
    caption: text("caption"),
    // Free-form single-select style facets, used for filtering + leaderboards.
    aesthetic: text("aesthetic"),
    occasion: text("occasion"),
    // Elo ratings, one per leaderboard dimension.
    eloOverall: real("elo_overall").notNull().default(1200),
    eloAesthetic: real("elo_aesthetic").notNull().default(1200),
    eloOccasion: real("elo_occasion").notNull().default(1200),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("outfits_user_idx").on(t.userId),
    aestheticIdx: index("outfits_aesthetic_idx").on(t.aesthetic),
    occasionIdx: index("outfits_occasion_idx").on(t.occasion),
  })
);

export const garments = sqliteTable(
  "garments",
  {
    id: text("id").primaryKey(),
    outfitId: text("outfit_id")
      .notNull()
      .references(() => outfits.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand"),
    store: text("store"),
    priceCents: integer("price_cents"),
    size: text("size"),
    // Normalized 0..1 pin position on the photo (interactive garment pins).
    pinX: real("pin_x"),
    pinY: real("pin_y"),
  },
  (t) => ({
    outfitIdx: index("garments_outfit_idx").on(t.outfitId),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Outfit = typeof outfits.$inferSelect;
export type NewOutfit = typeof outfits.$inferInsert;
export type Garment = typeof garments.$inferSelect;
export type NewGarment = typeof garments.$inferInsert;
export type Collection = typeof collections.$inferSelect;
