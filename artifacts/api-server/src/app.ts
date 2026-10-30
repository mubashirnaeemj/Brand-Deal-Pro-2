import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import mavlitProxy from "./routes/mavlitProxy";
import { corsMiddleware, jsonErrorHandler, originCheck } from "./lib/security";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(corsMiddleware);
app.use(originCheck);
app.use(cookieParser());
// A pasted contract can be 20,000 characters; this route gets a larger JSON limit (first, so the 32 KB parser below skips it).
app.use("/api/mavlit/contract-advice", express.json({ limit: "64kb" }));
app.use(express.json({ limit: "32kb" }));
app.use("/api/mavlit", mavlitProxy);

app.use("/api", router);
app.use(jsonErrorHandler);

export default app;
