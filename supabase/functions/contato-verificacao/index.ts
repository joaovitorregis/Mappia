import { criarHandler } from "./handler.mjs";

Deno.serve(criarHandler(Deno.env.toObject()));
