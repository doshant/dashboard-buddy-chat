# Dashboard Buddy Chat

Build a simple, interactive demo of a Power BI dashboard with an integrated chatbot. Use the attached screenshot as the design reference.

Dashboard

Recreate the Executive Summary page with the same layout, KPI cards, charts, filters, purple/green color theme, and bottom navigation tabs.

Use dummy data matching the values visible in the screenshot.

Make the dashboard visually polished and responsive.

Other navigation tabs can be placeholders.

Chatbot

Add a floating chatbot icon at the bottom-right corner.

Clicking it should open a chat panel on the right side while keeping the dashboard visible.

Display a welcome message: "Hi! I'm your Dashboard Assistant. What would you like to know?"

Show clickable suggested questions:

What is driving the decline in prescriptions?

Compare unit sales across products.

Which product has the highest growth in writers?

How has patient market share changed?

Summarize the key insights from this dashboard.

When a user clicks a question, display it as a chat message followed by a predefined dummy response relevant to that question.

Include a few additional suggested questions after each response to make the conversation feel interactive.

Allow users to type a message, but predefined responses are sufficient. For unrecognized questions, display: "I'm still learning! Please try one of the suggested questions."

Include a clear conversation button and a close button.

Important

This is a UI prototype only. Do not implement AI, APIs, databases, authentication, or backend functionality.

Use React, TypeScript, and Recharts if needed.

Keep the implementation lightweight and focus on the visual design and working interactions.

Prioritize the dashboard and chatbot experience over additional features.

Ensure everything works in the Lovable preview without additional configuration.
Sharing img for dashboard as a ref

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dashboard-buddy-chat.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d03b7945-fd63-47b6-8c70-ebab16198ab7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
