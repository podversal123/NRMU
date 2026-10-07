import Image from "next/image";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-coal px-4 text-light">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-4">
          <Image src="/logo.jpg" alt="" width={64} height={64} className="h-16 w-16 rounded-full ring-2 ring-signal" priority />
          <div>
            <p className="font-display text-3xl font-bold leading-none">NRMU Admin</p>
            <p className="mt-1 text-sm text-dim">Northern Railway Men&apos;s Union</p>
          </div>
        </div>
        <LoginForm />
        <div className="track mt-8" />
      </div>
    </main>
  );
}
