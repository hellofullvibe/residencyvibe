"use client";

import Image from "next/image";

export default function DonationCard({
  title = "Help Us Keep It Running",
  description = "This service is free for everyone. If it helped you, consider a small donation to keep it running.",
  buttonLabel = "Support Us",
  href = "https://buymeacoffee.com/residencyvibe",
  imageSrc = "/support.png",
  imageClass = "",
  className = "",
  verticle = false,
}: {
  title?: string;
  description?: string;
  buttonLabel?: string;
  href?: string;
  imageSrc?: string;
  imageClass?: string;
  className?: string;
  verticle?: boolean;
}) {
  return (
    <div
      className={`flex ${verticle ? "flex-col" : "flex-col sm:flex-row"} gap-12 bg-blue-700 p-8 sm:items-center ${className}`}
    >
      <div className="flex-1 flex flex-col gap-8 w-full">
        <div className="flex flex-col gap-1 w-full">

        <h2 className="text-lg font-semibold text-white">
          {title}
        </h2>
        <p className="leading-relaxed text-sm text-white opacity-80">{description}</p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-14 w-full sm:w-60 items-center justify-center bg-white font-semibold text-blue-700 transition-all duration-300 ease-in-out hover:bg-gray-100"
        >
          {buttonLabel}
        </a>
      </div>

      <div className="flex items-center justify-center">
        <Image
          src={imageSrc}
          alt="Donation Illustration"
          width={320}
          height={200}
          className={`h-auto w-full sm:w-60 object-contain ${imageClass}`}
        />
      </div>
    </div>
  );
}