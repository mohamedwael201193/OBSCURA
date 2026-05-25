import { motion } from "framer-motion";

export default function ProblemStatementCard() {
  return (
    <section className="bg-white px-5 py-16 md:px-8 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-[1200px] rounded-[2rem] bg-forest px-8 py-16 md:px-16 md:py-24"
      >
        <p className="text-center font-spadeDisplay text-2xl font-medium leading-snug tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
          <span className="text-white">
            Wallets process thousands of transactions every day,{" "}
          </span>
          <span className="text-lime-accent">
            but most onchain value is fully exposed.
          </span>
        </p>
      </motion.div>
    </section>
  );
}
