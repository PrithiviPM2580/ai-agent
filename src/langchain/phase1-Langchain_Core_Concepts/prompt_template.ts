import { PromptTemplate } from "@langchain/core/prompts";

(async () => {
  const template = new PromptTemplate({
    inputVariables: ["language"],
    template: "Write a short poem about programming in {language}",
  });

  const prompt = await template.format({ language: "Javascript" });
  console.log(prompt);
})();
