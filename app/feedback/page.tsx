import FeedbackForm from "@/components/FeedbackForm";

export const metadata = {
  title: "Suggest a feature — Triangle Price Book",
  description:
    "Missing a category? Have a feature request? Tell us in 300 characters or less.",
};

/**
 * /feedback — the standalone feedback page (linked from the header and
 * footer nav).
 */
export default function FeedbackPage() {
  return (
    <div className="py-10 max-w-2xl mx-auto px-4">
      <h1 className="font-serif text-4xl text-ink sm:text-5xl">
        Suggest a feature
      </h1>
      <p className="mt-2 text-muted">
        Missing a category? Have an idea that would make this more useful? Or
        did you get a price you couldn&rsquo;t find a way to submit or tag to
        an existing category? Tell us — 300 characters or less, no account
        needed. Leave an email if you&rsquo;d like a reply.
      </p>
      <div className="mt-6">
        <FeedbackForm />
      </div>
    </div>
  );
}
