# Nomi: Complete the Outfit in Your Style

**Upload one item and build a complete outfit in your style, not buy a closet.**

Nomi solves the gap between inspiration and individual pieces. Whether you're looking at something in a store or styling what you already own, finding pieces that actually work together (in *your* style) is the hard part.

Nomi bridges that gap by letting you upload a single item, then instantly discovering complementary pieces across trusted retailers that match both your existing wardrobe (or shopping goal) and your aesthetic. Build complete outfits. Stop buying individual pieces that don't work together.

## The Problem

You know what you like. But whether you're shopping or styling what you own, the question is always the same: *What else goes with this?* And more importantly: *Will it feel like me?*

Most fashion apps throw 50 options at you. Nomi does the opposite: show you only the pieces that complete the outfit you're actually building. No more buying individual items that don't work together.

## How It Works

**1. Upload One Item**
Start with something you own or something you're looking at in a store. Just photograph it or add the link.

**2. Tell Us What You're Building**
Are you completing a work outfit? Weekend casual? Something dressy? Set the vibe.

**3. Get Personalized Recommendations**
Nomi scans vetted retailers and finds pieces that:
- Actually coordinate with your item
- Match your personal style (not just trends)
- Come in the right colors and materials
- Are available in your size

**4. Build the Complete Outfit**
Every recommendation links directly to the retailer. You're not buying random pieces anymore. You're building one cohesive outfit.

## Key Features

✨ **Upload & Discover**: One photo. Instant outfit completion.

🎨 **Style-Aware**: Nomi understands color theory, fabric compatibility, and the difference between trendy and timeless.

🛍️ **Retail Verified**: Recommendations come from curated fashion retailers, each specialist in their category.

⚡ **Build Don't Scatter**: Direct links to buy. No more closets full of pieces that don't work together.

📐 **Complete Your Look**: Find the missing pieces that make an outfit feel finished, not 47 options that might work.

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes
- **ML/Style Engine:** Claude AI for style analysis and recommendations
- **Data:** Real-time product scraping and retail integration
- **Storage:** Supabase (PostgreSQL)


## Getting Started

### Prerequisites
- Node.js 24+
- npm or yarn

### Installation

```bash
# Clone the repo
git clone https://github.com/gheed21/nomi.git
cd nomi

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Add your API keys:
# - CLAUDE_API_KEY (Anthropic)
# - PINTEREST_API_KEY
# - SCRAPINGBEE_API_KEY (for product scraping)

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.


## Environment Variables

```env
# Anthropic API (Claude AI)
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_key_here

# Product Link Scraping
SCRAPINGBEE_API_KEY=your_key_here

# Pinterest Integration
PINTEREST_API_KEY=your_key_here
```


## How to Use Nomi

1. **Home Screen:** Click "Upload an Item"
2. **Upload:** Take or select a photo of something you own
3. **Describe:** Tell Nomi what kind of outfit you're building
4. **Ask Nomi:** Chat with the AI to refine recommendations
5. **Explore:** Browse recommendations, get style explanations
6. **Buy:** Click through to the retailer and shop


## The ICP

**You** are someone who:
- Already has a clear sense of personal style
- Saves outfit inspiration but struggles to execute it
- Wants to shop smarter, not more
- Values quality and fit over quantity
- Gets frustrated when pieces "look good separately but don't work together"


## Why Nomi

Most fashion recommendation engines optimize for *variety* and *volume*—they want you to buy more. Nomi optimizes for *fit* and *completeness*. We make one great outfit possible instead of 50 mediocre ones.

The result: less decision fatigue, less buyer's remorse, more confidence in what you wear.


## Project Status

Nomi is actively in development. Features like style learning (as you buy and rate items) and wardrobe analytics are on the roadmap.


## Contributing

Have ideas? Found a bug? Contributions welcome.

```bash
# Create a feature branch
git checkout -b feature/your-feature

# Make your changes and commit
git commit -m "feat: describe your change"

# Push and open a PR
git push origin feature/your-feature
```


## License

MIT


## Questions?

**What is Nomi?** A fashion copilot that builds complete outfits around one item, whether you own it or see it while shopping.

**Who is it for?** Anyone who knows their style but struggles to find pieces that actually work together.

**How is it different?** We optimize for outfit completion, not shopping volume. Build coherent looks instead of collecting random pieces.

**Is it free?** Currently in development. Early access coming soon.

Upload one item. Build a complete outfit. Feel like you.
