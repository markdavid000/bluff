import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TableScreen } from "@/features/table";
import { parseTableLink } from "@/lib/table-links";

export const metadata: Metadata = { title: "Table", robots: { index: false } };

export default async function TablePage({ params }: PageProps<"/table/[id]">) {
  const { id } = await params;
  const tableId = /^\d{1,18}$/.test(id) ? parseTableLink(id) : null;
  if (tableId === null) notFound();
  return <TableScreen id={tableId} />;
}
