import type { Customer } from "@/types";

export function customerDisplayName(customer: Pick<Customer, "nameAr" | "nameEn">) {
  return customer.nameAr || customer.nameEn;
}

export const SAUDI_ARABIA_BILINGUAL = "المملكة العربية السعودية / Kingdom of Saudi Arabia";
