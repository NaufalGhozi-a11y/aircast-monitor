import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-base-800 text-base-400">
        <SearchX className="h-6 w-6" />
      </div>
      <h2 className="text-[16px] font-semibold text-base-50">Not found</h2>
      <p className="max-w-sm text-[13px] text-base-400">
        That client PC or page doesn&apos;t exist in the current fleet.
      </p>
      <Link href="/dashboard">
        <Button variant="primary" size="sm">
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
