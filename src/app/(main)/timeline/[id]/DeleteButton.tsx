"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

export default function DeleteMemoryButton({ memoryId }: { memoryId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/timeline");
        router.refresh();
      }
    } catch {
      console.error("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex gap-2">
        <Button
          variant="danger"
          size="sm"
          loading={loading}
          onClick={handleDelete}
        >
          确认删除
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          取消
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setConfirming(true)}
      className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
    >
      删除
    </Button>
  );
}
