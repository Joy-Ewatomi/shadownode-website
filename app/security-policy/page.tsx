import { permanentRedirect } from "next/navigation";

export default function LegacySecurityPolicyPage() {
  permanentRedirect("/security");
}
