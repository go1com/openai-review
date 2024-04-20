"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureOpenAIExec = void 0;
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const core = __importStar(require("@actions/core"));
const AzureOpenAIExec = async (prompt) => {
    const key = core.getInput("azure-openai-api-key");
    const endpoint = core.getInput("azure-openai-endpoint");
    const client = new OpenAIClient(endpoint, new AzureKeyCredential(key));
    core.debug(`azure-openai-prompt: ${core.getInput("azure-openai-prompt")}`);
    const { choices } = await client.getCompletions(core.getInput("model"), 
    // core.getInput("openai-prompt"),
    prompt, {
        maxTokens: 256,
    });
    const completion = choices[0].text;
    return completion.trim();
};
exports.AzureOpenAIExec = AzureOpenAIExec;
