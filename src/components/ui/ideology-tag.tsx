"use client";

import { useState, useEffect, useRef } from "react";

const DEFINITIONS: Record<string, string> = {
  "Ambedkarism":
    "A social and political philosophy inspired by B. R. Ambedkar, emphasising equality, the annihilation of caste, and the rights of Dalits and other marginalised communities.",
  "Anti-caste politics":
    "A political stance that actively opposes India's caste hierarchy and works to dismantle caste-based discrimination in law, society, and institutions.",
  "Centrism":
    "A political position that avoids extreme left or right views, favouring moderate and balanced policies that draw from both sides of the spectrum.",
  "Communism":
    "A political ideology advocating common ownership of the means of production, the abolition of private property, and a classless, stateless society.",
  "Dalit rights":
    "A political focus on securing legal protections, social dignity, and equal opportunity for Dalits — communities historically oppressed under the caste system.",
  "Democratic socialism":
    "A belief that a socialist economy can and should be achieved through democratic means, combining public ownership of key industries with free elections and civil liberties.",
  "Dravidian politics":
    "A political tradition rooted in the Dravidian movement of South India, emphasising Tamil and South Indian identity, social justice, and opposition to Brahminical dominance.",
  "Economic liberalism":
    "Support for free markets, limited government intervention in the economy, and policies such as privatisation, deregulation, and open trade.",
  "Hindu nationalism":
    "A political ideology that defines India as primarily a Hindu nation and seeks to promote Hindu cultural, religious, and social values in governance and public life.",
  "Left-wing":
    "A broad political orientation that prioritises social equality, workers' rights, and greater government intervention to reduce inequality and protect vulnerable groups.",
  "Liberalism":
    "A political philosophy centred on individual freedoms, rule of law, representative democracy, and tolerance for diverse views and lifestyles.",
  "Populism":
    "A political approach that claims to represent ordinary people against a corrupt or out-of-touch elite, often blurring traditional left-right distinctions.",
  "Secularism":
    "The principle that government and public institutions should be separate from religion, treating all faiths equally and without official preference.",
  "Social conservatism":
    "A political stance that values traditional social institutions, family structures, and moral norms, often drawing on religious or cultural heritage.",
  "Social democracy":
    "A political ideology that supports a competitive market economy alongside strong welfare-state programs, labour rights, and redistribution to achieve greater equality.",
  "Social justice":
    "A political commitment to ensuring fair distribution of wealth, opportunities, and privileges within society, with particular attention to historically marginalised groups.",
  "Socialism":
    "A political and economic system in which the means of production are owned or regulated collectively, aiming to reduce inequality and ensure basic needs are met for all.",
  "Tamil nationalism":
    "A political ideology that asserts the distinct cultural, linguistic, and political identity of Tamil people and advocates for their rights and self-determination.",
  "Vanniyar rights":
    "A political focus on securing reservations, economic opportunities, and social recognition for the Vanniyar community, a large agrarian caste group in Tamil Nadu.",
};

export function IdeologyTag({ tag }: { tag: string }) {
  const definition = DEFINITIONS[tag] ?? `A political ideology or value associated with ${tag}.`;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-block group"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }}
    >
      {/* The tag pill */}
      <span className="inline-block bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded cursor-help border-b border-dotted border-gray-400">
        {tag}
      </span>

      {/* Tooltip — shown on hover (desktop) via group-hover, or on tap (mobile) via open state */}
      <span
        className={`
          pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
          w-56 rounded bg-gray-900 text-white text-xs leading-relaxed px-3 py-2
          shadow-lg
          transition-opacity duration-150
          ${open ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
        `}
        role="tooltip"
      >
        {definition}
        {/* Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
