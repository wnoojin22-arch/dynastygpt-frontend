import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#06080d" }}>
      <SignIn />
    </div>
  );
}
