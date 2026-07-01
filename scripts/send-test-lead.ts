/**
 * Fire a sample submission at the running server's public form endpoint.
 *   npm run dev                     # in one terminal
 *   npm run test:lead you@email.com # in another (send the toolkit to yourself)
 */
import "dotenv/config";

const PORT = process.env.PORT ?? "3000";
const email = process.argv[2];

if (!email) {
  console.error("Usage: npm run test:lead <your-email@example.com>");
  console.error("(Pass your own email so the delivery email comes to you, not a stranger.)");
  process.exit(1);
}

const submission = {
  name: "Dana Reyes",
  email,
  company: "Acme Robotics",
  challenge: "Leads sit for hours before anyone replies and we lose them to faster competitors.",
  website: "", // honeypot left empty
  utm_source: "x",
  utm_campaign: "launch",
};

const res = await fetch(`http://localhost:${PORT}/lead`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(submission),
});

console.log("Status:", res.status);
console.log("Body:  ", await res.text());
