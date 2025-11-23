import tracerPlugin from "@eggjs/tracer";
import multipartPlugin from "@eggjs/multipart";

export default {
  // enable tracer plugin
  ...tracerPlugin(),
  // enable sequelize plugin
  sequelize: {
    enable: true,
    package: "egg-sequelize",
  },
  // enable multipart plugin for file upload
  ...multipartPlugin(),
  // enable cors
  cors: {
    enable: true,
    package: "egg-cors",
  },
};
