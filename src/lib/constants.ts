import {
  Laptop,
  Wallet,
  Key,
  Backpack,
  FileText,
  Gem,
  Shirt,
  PawPrint,
  Package,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/types";

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  Electronics: Laptop,
  Wallets: Wallet,
  Keys: Key,
  Bags: Backpack,
  Documents: FileText,
  Jewelry: Gem,
  Clothing: Shirt,
  Pets: PawPrint,
  Other: Package,
};

export const PAGE_SIZE = 12;
