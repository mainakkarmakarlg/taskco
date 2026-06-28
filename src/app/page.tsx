import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/ui";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <PageContainer>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            Task<span className="text-blue-600">Co</span>
          </h1>
          <p className="mt-3 text-gray-600">
            A simple home for your projects and tasks. Group work into projects,
            track status and priority, and stay on top of what&apos;s due.
          </p>

          <Card className="mt-8 text-left">
            <h2 className="text-lg font-semibold text-gray-900">Get started</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create an account or sign in to view your dashboard.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="sm:flex-1">
                <Button className="w-full">Create account</Button>
              </Link>
              <Link href="/login" className="sm:flex-1">
                <Button variant="secondary" className="w-full">
                  Sign in
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
