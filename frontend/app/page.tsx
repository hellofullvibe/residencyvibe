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
            className="bg-blue-700 w-full sm:w-auto sm:px-8 h-14 flex items-center justify-center font-semibold text-white hover:bg-blue-800 transition-all ease-in-out duration-300"
          >
            Browse Questions
          </Link>
          <Link
            href="/signup"
            className="bg-white w-full sm:w-auto sm:px-8 h-14 flex items-center justify-center font-semibold text-blue-700 hover:bg-gray-100 transition-all ease-in-out duration-300"
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
                title: "What is residency vibe",
                body: "It is something about the program. Like you are from a community and you want to share your experience with others. Where you can share your questions and answers and learn from each other.",
              },
              {
                title: "Why do we need this",
                body: "We all know the interview question bank is scattered. We want to create a community where we can share our questions and answers and learn from each other.",
              },
              {
                title: "How do i contribute?",
                body: "You can contribute by sharing your questions and answers and learn from each other.",
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}