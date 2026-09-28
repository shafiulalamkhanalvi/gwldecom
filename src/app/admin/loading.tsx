import { PageSpinner } from "@/components/ui/page-spinner"

// Shown instantly inside the admin shell while the next admin page loads,
// so the sidebar stays put and only the content area shows the spinner.
export default function AdminLoading() {
  return <PageSpinner />
}
