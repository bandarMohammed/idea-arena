import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata: Metadata = {
  title: "Settings — Agent Arena",
};

export default function SettingsPage() {
  return (
    <div id="main">
      <SettingsForm />
    </div>
  );
}
