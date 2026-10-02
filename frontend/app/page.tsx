import DonationCard from "@/components/DonationCard";
import FaqAccordion from "@/components/FaqAccordion";
import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto w-full">
      <section className="py-25 text-center px-6 sm:px-0">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-black sm:text-5xl">
          Ace Your Residency Interviews
        </h1>
        <p className="mx-auto mt-8 sm:mt-4 max-w-xl text-lg text-slate-600">
          A shared question bank for residency interviews. Practice real questions,
          see where others encountered them, and learn from community answers.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Link
            href="/questions"
            className="cursor-pointer bg-blue-700 w-full sm:w-auto sm:px-8 h-14 flex items-center justify-center font-semibold text-white hover:bg-blue-800 transition-all ease-in-out duration-300"
          >
            Browse Questions
          </Link>
          <Link
            href="/signup"
            className="cursor-pointer bg-white w-full sm:w-auto sm:px-8 h-14 flex items-center justify-center font-semibold text-blue-700 hover:bg-gray-100 transition-all ease-in-out duration-300"
          >
            Join Community
          </Link>
        </div>
      </section>

      <section className="w-full bg-white py-25">
        <div className="mx-auto w-full max-w-6xl flex flex-col px-6 sm:px-0 gap-1 pb-8">
          <h2 className="text-2xl font-bold tracking-tight text-black  sm:text-3xl">Key Features</h2>
          <p className="leading-relaxed text-slate-600">What we would like to provide to the community.</p>
        </div>
        <div className="mx-auto w-full max-w-6xl flex flex-col sm:flex-row gap-2 px-6 sm:px-0">
        {[
          {
            title: "Organized by category",
            imageSource: "/organize.png",
            body: "About You, About Program, Hobbies, Situation, Medical, Social and more.",
          },
          {
            title: "Community answers",
            imageSource: "/response.png",
            body: "Comment on questions and reply to others — learn how to answer the hard ones.",
          },
          {
            title: "Track what matters",
            imageSource: "/track.png",
            body: "Star questions, mark where you encountered them, and save ones to practice.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-gray-100 py-8 px-6 flex flex-col gap-4"
          >
            <img 
            src={f.imageSource}
            className="w-full h-80 object-contain p-4"
            alt=""/>
            <div className="flex flex-col gap-1"> 
              <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="leading-relaxed text-slate-600">{f.body}</p>
            </div>
          </div>
        ))}
        </div>
      </section>

      <section className="w-full py-25">
        <div className="mx-auto w-full max-w-6xl flex flex-col px-6 sm:px-0 gap-1 pb-8">
          <DonationCard
            description="Residency Vibe is free for everyone. If it helped you prepare, consider a small donation to keep it running."
          />
        </div>
      </section>

      <section className="w-full bg-white py-25">
        <div className="mx-auto w-full max-w-6xl flex flex-col px-6 sm:px-0 gap-1 pb-8">
          <h2 className="text-2xl font-bold tracking-tight text-black  sm:text-3xl">Frequently Asked Questions</h2>
          <p className="leading-relaxed text-slate-600">Let us tell you few commonly asked questions</p>
        </div>
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-0">
          <FaqAccordion
            items={[
             {
  title: "What is Residency Vibe?",
  body: "Residency Vibe is a community-driven platform for residency interview preparation. You can explore interview questions, share your responses, learn from other applicants, save questions, and find a practice partner.",
},
{
  title: "Why do we need this?",
  body: "Residency interview questions are often scattered across different places. We want to bring them together in one community where applicants can share questions, responses, experiences, and learn from each other.",
},
{
  title: "Where do the questions come from?",
  body: "We collect previously asked interview questions shared by applicants and the medical community, then organize them by program and topic to make them easier to find and practice. We’re grateful to everyone who has shared their interview experiences with the community.",
},
{
  title: "How do I contribute?",
  body: "You can contribute by adding interview questions, sharing your responses, and replying to other applicants. You’ll find options to contribute directly in the Questions Bank.",
},
{
  title: "How do I find a practice partner?",
  body: "Go to the Find a Partner page and create a practice session by filling out the requested details. You can also browse existing sessions and reach out to the person who created a session you’re interested in.",
},
{
  title: "Is Finding a Partner free?",
  body: "Yes. Finding a Partner is completely free. Residency Vibe simply provides a place for applicants to connect. Participants are responsible for contacting each other and coordinating their own practice sessions.",
},
{
  title: "Do you share my information?",
  body: "We respect your privacy and do not sell your personal information. Information is used only as needed to operate and maintain Residency Vibe and the features you choose to use.",
},
{
  title: "How should I protect other users' privacy?",
  body: "Residency Vibe is a community-run platform, and we expect everyone to respect each other's privacy. Please do not share another user's personal information, conversations, or responses outside the platform without their permission.",
},
{
  title: "Are you responsible for interactions between users?",
  body: "Residency Vibe provides the platform to help applicants connect, but we do not supervise conversations or practice sessions. Users are responsible for their own communication and interactions with other participants.",
},
{
  title: "What does your support help with?",
  body: "Residency Vibe is supported by the community. Contributions help us maintain the website, hosting, infrastructure, and existing features, while also allowing us to build new tools for residency interview preparation.",
},
{
  title: "Can I use Residency Vibe without finding a partner?",
  body: "Absolutely. You can use the Questions Bank, search questions and responses, save questions for later, share your own responses, and participate in discussions without joining a practice session.",
},
{
  title: "How can I report inappropriate content or behavior?",
  body: "If you come across inappropriate content, harassment, privacy violations, or other concerns, please contact us at contact@fullvice.com with the relevant details so we can review the issue.",
}
            ]}
          />
        </div>
      </section>
    </div>
  );
}