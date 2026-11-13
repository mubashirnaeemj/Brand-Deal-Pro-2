// Hard-coded "AI-style" content ideas, five per content category. {brand} is replaced with the post's brand.
// Posts from other niches are adapted for a music creator, since the logged-in creator is a music producer.
export type IdeaFormat = "Reel" | "Carousel" | "Story" | "Video";
export type IdeaRow = [title: string, hook: string, format: IdeaFormat];

export const IDEAS: Record<string, IdeaRow[]> = {
  "Beat Making": [
    ["Flip one {brand} sound into a full beat in 60 seconds", "Open on the finished beat, then rewind to the raw sample.", "Reel"],
    ["Make a beat with only three sounds", "A constraint turns the process into the entertainment.", "Reel"],
    ["One sample, three genres", "Flip a single {brand} loop into lo-fi, trap and house.", "Carousel"],
    ["My beat template, step by step", "Screenshot each stage of the session as a swipeable breakdown.", "Carousel"],
    ["Rating my followers' beats", "Duet community submissions made with {brand} sounds for built-in comments.", "Video"],
  ],
  Tutorials: [
    ["3 {brand} workflow tricks I wish I knew sooner", "Lead with the time saved, then show each trick on screen.", "Reel"],
    ["Beginner DAW mistakes and how to fix them", "One mistake per slide, with a before and after sound clip.", "Carousel"],
    ["Build a drop in five minutes", "Run a visible timer so viewers stay to see the result.", "Reel"],
    ["Learning a new tool in one day: honest results", "Document the wins and the frustrations to build trust.", "Video"],
    ["Cheat sheet: the shortcuts that save an hour", "A save-worthy carousel your audience will come back to.", "Carousel"],
  ],
  "Gear Reviews": [
    ["Honest 30-day review: is {brand} worth it?", "Share what changed in your workflow, including the downsides.", "Video"],
    ["Budget vs pro: can you hear the difference?", "Blind A/B clips and let viewers guess in the comments.", "Reel"],
    ["Unboxing and first-impression test", "Capture the reaction and one thing that surprised you.", "Reel"],
    ["What I'd buy first with $200", "A ranked shopping list is easy to share and easy to sponsor.", "Carousel"],
    ["Where {brand} sits in my signal chain", "A quick diagram story showing it in a real session.", "Story"],
  ],
  "Studio Vlogs": [
    ["A day in my studio, from blank session to finished demo", "Time-lapse the day and end on the full demo.", "Reel"],
    ["A studio setup under $1,000", "Show every item with its price. Brands love the transparency.", "Video"],
    ["What a real writing session looks like", "Keep the failed takes in. They make the good take land.", "Reel"],
    ["Desk tour: the gear I actually use", "Tag each piece and let brands find themselves in your setup.", "Carousel"],
    ["Behind the scenes of release week", "A story series that builds anticipation for the drop.", "Story"],
  ],
  "Makeup Tutorials": [
    ["One tool, three sounds", "Borrow the 'one product, three looks' format with a single {brand} instrument.", "Reel"],
    ["Raw take vs finished mix", "The audio version of a before and after transformation.", "Carousel"],
    ["Get the sound in ten minutes", "A fast, step-by-step walkthrough in the style of a full-face tutorial.", "Reel"],
    ["The mix recipe I use every time", "List your exact settings the way a makeup tutorial lists shades.", "Carousel"],
    ["Recreating a famous sound with budget gear", "Dupe culture, music edition: the expensive sound for less.", "Video"],
  ],
  GRWM: [
    ["Get ready with me for a studio session", "Talk through your goals for the session while you set up.", "Reel"],
    ["Pack my bag for a gig with me", "A casual, story-led format that fits an everyday brand mention.", "Story"],
    ["My pre-session ritual", "Coffee, warm-up and routing: a lifestyle angle on your craft.", "Reel"],
    ["Setting up for a livestream with me", "Narrate your checklist and tag each tool you use.", "Video"],
    ["Get ready with me for a release day", "A chatty countdown that works well with a brand tie-in.", "Reel"],
  ],
  Skincare: [
    ["My reset routine between long sessions", "Share the ear-and-eye-care habits that keep you producing.", "Reel"],
    ["Under-$30 studio upgrades", "The same shopping-list format that works for skincare picks.", "Carousel"],
    ["Is it worth it? Cheap vs expensive cables", "Test the product claim, then give a simple verdict.", "Reel"],
    ["Routine swap: my old workflow vs my new one", "Show what you dropped and what you kept.", "Story"],
    ["Product shelfie: what's on my desk", "A calm, aesthetic carousel with brand tags.", "Carousel"],
  ],
  Workouts: [
    ["Producing a beat in the same time as a workout", "Pair a timed set with a timed session for a shareable challenge.", "Reel"],
    ["Beginner producer 4-week plan", "Format your tutorials like a training split with a clear progression.", "Carousel"],
    ["Form check for your mixing habits", "Common mistakes and the fix, the way a coach would review a lift.", "Reel"],
    ["Home-studio circuit", "Five stations, five skills, one finished track.", "Video"],
    ["Beat of the week programme", "A recurring series gives {brand} a natural place to sponsor.", "Reel"],
  ],
  "Training Vlogs": [
    ["Studio camp vlog: 3 days, 3 tracks", "Borrow the training-camp format with a clear daily goal.", "Video"],
    ["Everything I used this week, wearing it in", "Long-term product use with a day-by-day log.", "Reel"],
    ["Pre-session routine that actually works", "Show the routine, then the result in the session.", "Reel"],
    ["My weekly schedule as a producer", "A transparent schedule post performs well with brand teams.", "Carousel"],
    ["Brutally honest 100-hour review", "Report what held up after heavy use, including the flaws.", "Video"],
  ],
  Nutrition: [
    ["What I eat on a long mixing day", "A simple, repeatable lifestyle post with a product tie-in.", "Reel"],
    ["Meal prep for a producer's week", "Plan once, create all week: the same promise as meal prep.", "Carousel"],
    ["Budget breakdown of my studio week", "Itemise costs the way a grocery haul would.", "Story"],
    ["Brain-food and focus: what works for me", "Pair a routine with a product mention that feels natural.", "Reel"],
    ["Ingredient list: what's in my session playlist", "Break a sound down into its parts, like a recipe.", "Carousel"],
  ],
  "Wellness Routines": [
    ["My creative morning routine", "Show the first hour of your day and what it does for your sessions.", "Reel"],
    ["A week of better focus, tracked", "Report honest numbers, including the days it didn't work.", "Video"],
    ["Screen-free hour before a writing session", "A relatable habit with strong save and share potential.", "Carousel"],
    ["Sleep and sound: how rest changes my mixes", "Link wellness to craft in a way brands can sponsor.", "Reel"],
    ["Things I changed for burnout-proof creating", "A numbered list that invites personal stories in the comments.", "Carousel"],
  ],
  Recovery: [
    ["How I protect my ears and stay fresh", "A practical recovery routine, ideal for a {brand} tie-in.", "Reel"],
    ["Recovery vs output: how I plan my week", "Show a planning view with rest days built in.", "Carousel"],
    ["The 20-minute reset between sessions", "A short, repeatable routine that is easy to copy.", "Reel"],
    ["What my data says about my best sessions", "Share a pattern you found and what you changed.", "Video"],
    ["Rest-day rituals that make me more creative", "A soft lifestyle story with natural product mentions.", "Story"],
  ],
};
