import { redirect } from "next/navigation";

export default function TagihanRedirectPage() {
  redirect("/transaksi?tab=tagihan");
}
