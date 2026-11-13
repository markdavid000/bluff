import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TableScreen } from "@/features/table";
import { parseInvite } from "@/lib/table-links";

export const metadata: Metadata = { title: "Table", robots: { index: false } };

export default async function TablePage({ params }: PageProps<"/table/[id]">) {
  const { id } = await params;
  const invite = /^\d{1,15}$/.test(id) ? parseInvite(id) : null;
  if (invite === null) notFound();
  return <TableScreen id={invite.id} />;
}
