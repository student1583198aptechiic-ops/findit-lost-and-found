export type ItemType = "LOST" | "FOUND";
export type ItemStatus = "open" | "claimed" | "returned" | "closed";
export type ClaimStatus = "pending" | "under_review" | "approved" | "rejected" | "completed";
export type UserRole = "user" | "admin";
export type AccountStatus = "active" | "suspended";
export type ContactPreference = "message" | "email";

export const CATEGORIES = [
  "Electronics",
  "Wallets",
  "Keys",
  "Bags",
  "Documents",
  "Jewelry",
  "Clothing",
  "Pets",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  account_status: AccountStatus;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  category: Category;
  color: string;
  identifying_characteristics: string;
  item_type: ItemType;
  status: ItemStatus;
  images: string[];
  approximate_location: string;
  lat: number | null;
  lng: number | null;
  date_lost_or_found: string;
  reward: string;
  reporter_id: string;
  contact_preference: ContactPreference;
  created_at: string;
  updated_at: string;
}

export interface ItemWithReporter extends Item {
  reporter?: PublicProfile | null;
}

export interface Match {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  score: number;
  matching_attributes: string[];
  created_at: string;
}

export interface MatchWithItems extends Match {
  lost_item?: ItemWithReporter;
  found_item?: ItemWithReporter;
}

export interface Claim {
  id: string;
  item_id: string;
  claimant_id: string;
  private_description: string;
  status: ClaimStatus;
  reviewed_by: string | null;
  review_notes: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimWithItem extends Claim {
  item?: ItemWithReporter;
  claimant?: PublicProfile | null;
}

export interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  related_item_id: string | null;
  related_claim_id: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface ConversationWithProfiles extends Conversation {
  other_profile?: PublicProfile | null;
  related_item?: Pick<Item, "id" | "title" | "item_type"> | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  related_resource_id: string | null;
  related_resource_type: string | null;
  read_at: string | null;
  created_at: string;
}

export interface PlatformStats {
  total_items: number;
  lost_count: number;
  found_count: number;
  returned_count: number;
  user_count: number;
}
