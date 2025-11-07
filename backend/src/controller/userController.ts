//userController
import { Request, response, Response } from "express";
import {
  validatePublicKey,
  generateAuthMessage,
  verifySignature,
  verifyNonce,
  findOrCreateUser,
} from "../helpers/user/authHelpers";
import logger from "../utils/logger";
import { responseHandler } from "../utils/resHandler";

export default {
  requestMessage: async (req: Request, res: Response) => {
    try {
      const publicKey = req.params.publicKey;
      validatePublicKey(publicKey);
      const payload = await generateAuthMessage(publicKey);
      return responseHandler.success(res,payload);
    } catch (e) {
      logger.error(e);
      responseHandler.error(res, e);
    }
  },

  verifyMessage: async (req: Request, res: Response) => {
    const data = req.body;
    const { publicKey, signature, message } = data;
    //TODO: use zod for input validation
    try {
      await verifySignature(publicKey, signature, message);
      const nonce = message.split("Nonce:")[1].trim();

      if (!nonce) {
        return res.status(400).json({ message: "Missing nonce" });
      }

      await verifyNonce(nonce, publicKey);

      const { user, token } = await findOrCreateUser(publicKey);

      return responseHandler.success(res,{
        message: "Signature verified",
        error: null,
        token: token,
        user,
      });
    } catch (e) {
      logger.error(e);
      return responseHandler.error(res, e);
    }
  },
};
