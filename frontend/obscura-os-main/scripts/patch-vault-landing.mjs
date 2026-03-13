import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/components/landing/vault");

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".tsx")) continue;
  const filePath = path.join(dir, f);
  let s = fs.readFileSync(filePath, "utf8");
  s = s.replaceAll('from "motion/react"', 'from "framer-motion"');
  s = s.replaceAll("from '@tanstack/react-router'", "from 'react-router-dom'");
  s = s.replaceAll('from "@tanstack/react-router"', 'from "react-router-dom"');
  s = s.replaceAll('import glyphSrc from "@/assets/money-glyph-3d.png";\n\n', "");
  s = s.replaceAll("src={glyphSrc}", 'src="/images/money-glyph-3d.png"');
  fs.writeFileSync(filePath, s);
}

console.log("patched vault landing components");
