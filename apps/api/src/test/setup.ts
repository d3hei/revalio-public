import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// apps/api/src/test → repo root .env
loadEnv({ path: path.resolve(here, "../../../../.env") });
loadEnv({ path: path.resolve(here, "../../.env") });
