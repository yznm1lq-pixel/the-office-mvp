"use client";

import { useState } from "react";

export function CopyInviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const value = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("انسخ رابط الدعوة:", value);
    }
  }
  return <div className="invite-link-box"><div className="min-w-0"><p className="text-xs font-bold text-violet-800">رابط الدعوة جاهز</p><p className="mt-1 text-xs text-violet-700">انسخه وأرسله للموظف عبر وسيلة التواصل المناسبة.</p></div><button type="button" onClick={copy} className="secondary-button shrink-0">{copied ? "تم النسخ ✓" : "نسخ الرابط"}</button></div>;
}
