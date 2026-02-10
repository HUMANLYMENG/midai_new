import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 真实专辑数据 - 多种流派交错
const albumsData = [
  // Rock / Alternative
  {
    title: "OK Computer",
    artist: "Radiohead",
    year: "1997",
    genre: "Alternative Rock, Art Rock, Experimental",
    label: "Parlophone",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b273c8b444df094279e70d0ed856",
    tracks: [
      "Airbag", "Paranoid Android", "Subterranean Homesick Alien",
      "Exit Music (For a Film)", "Let Down", "Karma Police",
      "Fitter Happier", "Electioneering", "Climbing Up the Walls",
      "No Surprises", "Lucky", "The Tourist"
    ]
  },
  {
    title: "Kid A",
    artist: "Radiohead",
    year: "2000",
    genre: "Electronic, Experimental Rock, Ambient",
    label: "Parlophone",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735d5e36e1e3b2e3c5e5c5c5c5",
    tracks: [
      "Everything in Its Right Place", "Kid A", "The National Anthem",
      "How to Disappear Completely", "Treefingers", "Optimistic",
      "In Limbo", "Idioteque", "Morning Bell", "Motion Picture Soundtrack"
    ]
  },
  {
    title: "The Dark Side of the Moon",
    artist: "Pink Floyd",
    year: "1973",
    genre: "Progressive Rock, Psychedelic Rock, Art Rock",
    label: "Harvest",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b273ea7caaff71ceaef63b1bdaf8",
    tracks: [
      "Speak to Me", "Breathe", "On the Run", "Time",
      "The Great Gig in the Sky", "Money", "Us and Them",
      "Any Colour You Like", "Brain Damage", "Eclipse"
    ]
  },
  {
    title: "Wish You Were Here",
    artist: "Pink Floyd",
    year: "1975",
    genre: "Progressive Rock, Art Rock",
    label: "Harvest",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2731c3e0a58a3e7c3c5c5c5c5c5",
    tracks: [
      "Shine On You Crazy Diamond (Parts I-V)", "Welcome to the Machine",
      "Have a Cigar", "Wish You Were Here",
      "Shine On You Crazy Diamond (Parts VI-IX)"
    ]
  },
  {
    title: "Nevermind",
    artist: "Nirvana",
    year: "1991",
    genre: "Grunge, Alternative Rock, Punk Rock",
    label: "DGC",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b273e175a19e530c898d167d39bf",
    tracks: [
      "Smells Like Teen Spirit", "In Bloom", "Come as You Are",
      "Breed", "Lithium", "Polly", "Territorial Pissings",
      "Drain You", "Lounge Act", "Stay Away", "On a Plain", "Something in the Way"
    ]
  },
  {
    title: "In Utero",
    artist: "Nirvana",
    year: "1993",
    genre: "Grunge, Alternative Rock, Noise Rock",
    label: "DGC",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Serve the Servants", "Scentless Apprentice", "Heart-Shaped Box",
      "Rape Me", "Frances Farmer Will Have Her Revenge on Seattle",
      "Dumb", "Very Ape", "Milk It", "Pennyroyal Tea",
      "Radio Friendly Unit Shifter", "tourette's", "All Apologies"
    ]
  },
  
  // Jazz
  {
    title: "Kind of Blue",
    artist: "Miles Davis",
    year: "1959",
    genre: "Jazz, Modal Jazz, Cool Jazz",
    label: "Columbia",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "So What", "Freddie Freeloader", "Blue in Green",
      "All Blues", "Flamenco Sketches"
    ]
  },
  {
    title: "Bitches Brew",
    artist: "Miles Davis",
    year: "1970",
    genre: "Jazz Fusion, Experimental Jazz, Psychedelic Rock",
    label: "Columbia",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Pharaoh's Dance", "Bitches Brew", "Spanish Key",
      "John McLaughlin", "Miles Runs the Voodoo Down", "Sanctuary"
    ]
  },
  {
    title: "A Love Supreme",
    artist: "John Coltrane",
    year: "1965",
    genre: "Jazz, Modal Jazz, Spiritual Jazz",
    label: "Impulse!",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Part I: Acknowledgement", "Part II: Resolution",
      "Part III: Pursuance", "Part IV: Psalm"
    ]
  },
  {
    title: "Time Out",
    artist: "The Dave Brubeck Quartet",
    year: "1959",
    genre: "Jazz, Cool Jazz, West Coast Jazz",
    label: "Columbia",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Blue Rondo à la Turk", "Strange Meadow Lark", "Take Five",
      "Three to Get Ready", "Kathy's Waltz", "Everybody's Jumpin'",
      "Pick Up Sticks"
    ]
  },

  // Hip Hop / Rap / R&B
  {
    title: "To Pimp a Butterfly",
    artist: "Kendrick Lamar",
    year: "2015",
    genre: "Hip Hop, Jazz Rap, Funk, Soul",
    label: "Top Dawg/Aftermath/Interscope",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b273cdb6459028b595554449c1c0",
    tracks: [
      "Wesley's Theory", "For Free? (Interlude)", "King Kunta",
      "Institutionalized", "These Walls", "u", "Alright",
      "For Sale? (Interlude)", "Momma", "Hood Politics",
      "How Much a Dollar Cost", "Complexion (A Zulu Love)",
      "The Blacker the Berry", "You Ain't Gotta Lie (Momma Said)",
      "i", "Mortal Man"
    ]
  },
  {
    title: "good kid, m.A.A.d city",
    artist: "Kendrick Lamar",
    year: "2012",
    genre: "Hip Hop, West Coast Hip Hop, Conscious Hip Hop",
    label: "Top Dawg/Aftermath/Interscope",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Sherane a.k.a Master Splinter's Daughter", "Bitch, Don't Kill My Vibe",
      "Backseat Freestyle", "The Art of Peer Pressure",
      "Money Trees", "Poetic Justice", "good kid", "m.A.A.d city",
      "Swimming Pools (Drank)", "Sing About Me, I'm Dying of Thirst",
      "Real", "Compton"
    ]
  },
  {
    title: "My Beautiful Dark Twisted Fantasy",
    artist: "Kanye West",
    year: "2010",
    genre: "Hip Hop, Pop Rap, Experimental, Progressive Rap",
    label: "Roc-A-Fella/Def Jam",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b273d9194aa18fa4c9362b47464f",
    tracks: [
      "Dark Fantasy", "Gorgeous", "Power", "All of the Lights (Interlude)",
      "All of the Lights", "Monster", "So Appalled", "Devil in a New Dress",
      "Runaway", "Hell of a Life", "Blame Game", "Lost in the World", "Who Will Survive in America"
    ]
  },
  {
    title: "Yeezus",
    artist: "Kanye West",
    year: "2013",
    genre: "Hip Hop, Industrial, Experimental, Electronic",
    label: "Def Jam",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "On Sight", "Black Skinhead", "I Am a God", "New Slaves",
      "Hold My Liquor", "I'm in It", "Blood on the Leaves",
      "Guilt Trip", "Send It Up", "Bound 2"
    ]
  },
  {
    title: "Illmatic",
    artist: "Nas",
    year: "1994",
    genre: "Hip Hop, East Coast Hip Hop, Hardcore Hip Hop",
    label: "Columbia",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "The Genesis", "N.Y. State of Mind", "Life's a Bitch",
      "The World Is Yours", "Halftime", "Memory Lane (Sittin' in da Park)",
      "One Love", "One Time 4 Your Mind", "Represent", "It Ain't Hard to Tell"
    ]
  },
  {
    title: "Ready to Die",
    artist: "The Notorious B.I.G.",
    year: "1994",
    genre: "Hip Hop, East Coast Hip Hop, Hardcore Hip Hop",
    label: "Bad Boy",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Intro", "Things Done Changed", "Gimme the Loot", "Machine Gun Funk",
      "Warning", "Ready to Die", "One More Chance", "Fuck Me (Interlude)",
      "The What", "Juicy", "Everyday Struggle", "Me & My Bitch",
      "Big Poppa", "Respect", "Friend of Mine", "Unbelievable"
    ]
  },

  // Pop / Pop Rock
  {
    title: "Abbey Road",
    artist: "The Beatles",
    year: "1969",
    genre: "Rock, Pop Rock, Art Rock",
    label: "Apple",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Come Together", "Something", "Maxwell's Silver Hammer",
      "Oh! Darling", "Octopus's Garden", "I Want You (She's So Heavy)",
      "Here Comes the Sun", "Because", "You Never Give Me Your Money",
      "Sun King", "Mean Mr. Mustard", "Polythene Pam",
      "She Came in Through the Bathroom Window", "Golden Slumbers",
      "Carry That Weight", "The End", "Her Majesty"
    ]
  },
  {
    title: "Sgt. Pepper's Lonely Hearts Club Band",
    artist: "The Beatles",
    year: "1967",
    genre: "Rock, Psychedelic Rock, Art Pop",
    label: "Parlophone",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Sgt. Pepper's Lonely Hearts Club Band", "With a Little Help from My Friends",
      "Lucy in the Sky with Diamonds", "Getting Better",
      "Fixing a Hole", "She's Leaving Home", "Being for the Benefit of Mr. Kite!",
      "Within You Without You", "When I'm Sixty-Four", "Lovely Rita",
      "Good Morning Good Morning", "Sgt. Pepper's Lonely Hearts Club Band (Reprise)",
      "A Day in the Life"
    ]
  },
  {
    title: "Thriller",
    artist: "Michael Jackson",
    year: "1982",
    genre: "Pop, R&B, Post-disco, Funk",
    label: "Epic",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Wanna Be Startin' Somethin'", "Baby Be Mine", "The Girl Is Mine",
      "Thriller", "Beat It", "Billie Jean", "Human Nature",
      "P.Y.T. (Pretty Young Thing)", "The Lady in My Life"
    ]
  },
  {
    title: "Purple Rain",
    artist: "Prince",
    year: "1984",
    genre: "Pop Rock, Funk, R&B, Rock",
    label: "Warner Bros.",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Let's Go Crazy", "Take Me with U", "The Beautiful Ones",
      "Computer Blue", "Darling Nikki", "When Doves Cry",
      "I Would Die 4 U", "Baby I'm a Star", "Purple Rain"
    ]
  },

  // Electronic
  {
    title: "Random Access Memories",
    artist: "Daft Punk",
    year: "2013",
    genre: "Electronic, Disco, Funk, Synth-pop",
    label: "Columbia",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2731c5c5c5c5c5c5c5c5c5c5c5",
    tracks: [
      "Give Life Back to Music", "The Game of Love", "Giorgio by Moroder",
      "Within", "Instant Crush", "Lose Yourself to Dance",
      "Touch", "Get Lucky", "Beyond", "Motherboard",
      "Fragments of Time", "Doin' It Right", "Contact"
    ]
  },
  {
    title: "Discovery",
    artist: "Daft Punk",
    year: "2001",
    genre: "French House, Electronic, Disco",
    label: "Virgin",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "One More Time", "Aerodynamic", "Digital Love", "Harder, Better, Faster, Stronger",
      "Crescendolls", "Nightvision", "Superheroes", "High Life",
      "Something About Us", "Voyager", "Veridis Quo", "Short Circuit", "Face to Face", "Too Long"
    ]
  },
  {
    title: "Mezzanine",
    artist: "Massive Attack",
    year: "1998",
    genre: "Trip Hop, Electronic, Alternative Rock",
    label: "Virgin",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Angel", "Risingson", "Teardrop", "Inertia Creeps", "Exchange",
      "Dissolved Girl", "Man Next Door", "Black Milk", "Mezzanine",
      "Group Four", "(Exchange)"
    ]
  },
  {
    title: "Dummy",
    artist: "Portishead",
    year: "1994",
    genre: "Trip Hop, Electronic, Alternative Rock",
    label: "Go! Beat",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Mysterons", "Sour Times", "Strangers", "It Could Be Sweet",
      "Wandering Star", "Numb", "Roads", "Pedestal", "Biscuit", "Glory Box"
    ]
  },
  {
    title: "Selected Ambient Works 85-92",
    artist: "Aphex Twin",
    year: "1992",
    genre: "Ambient Techno, Electronic, IDM, Ambient",
    label: "Apollo",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Xtal", "Tha", "Pulsewidth", "Ageispolis", "i", "Green Calx",
      "Heliosphan", "We Are the Music Makers", "Schottkey 7th Path",
      "Ptolemy", "Hedphelym", "Delphium", "Actium"
    ]
  },

  // Indie / Art Rock
  {
    title: "Funeral",
    artist: "Arcade Fire",
    year: "2004",
    genre: "Indie Rock, Baroque Pop, Art Rock",
    label: "Merge",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Neighborhood #1 (Tunnels)", "Neighborhood #2 (Laïka)", "Une Année Sans Lumière",
      "Neighborhood #3 (Power Out)", "Neighborhood #4 (7 Kettles)",
      "Crown of Love", "Wake Up", "Haïti", "Rebellion (Lies)", "In the Backseat"
    ]
  },
  {
    title: "The Suburbs",
    artist: "Arcade Fire",
    year: "2010",
    genre: "Indie Rock, Alternative Rock, Art Rock",
    label: "Merge",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "The Suburbs", "Ready to Start", "Modern Man", "Rococo",
      "Empty Room", "City with No Children", "Half Light I", "Half Light II (No Celebration)",
      "Suburban War", "Month of May", "Wasted Hours", "Deep Blue",
      "We Used to Wait", "Sprawl I (Flatland)", "Sprawl II (Mountains Beyond Mountains)",
      "The Suburbs (Continued)"
    ]
  },
  {
    title: "Low",
    artist: "David Bowie",
    year: "1977",
    genre: "Art Rock, Electronic, Ambient, Experimental",
    label: "RCA",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Speed of Life", "Breaking Glass", "What in the World",
      "Sound and Vision", "Always Crashing in the Same Car", "Be My Wife",
      "A New Career in a New Town", "Warszawa", "Art Decade", "Weeping Wall", "Subterraneans"
    ]
  },
  {
    title: "Blackstar",
    artist: "David Bowie",
    year: "2016",
    genre: "Art Rock, Jazz Rock, Experimental, Electronic",
    label: "ISO/Columbia",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Blackstar", "'Tis a Pity She Was a Whore", "Lazarus", "Sue (Or in a Season of Crime)",
      "Girl Loves Me", "Dollar Days", "I Can't Give Everything Away"
    ]
  },
  {
    title: "Remain in Light",
    artist: "Talking Heads",
    year: "1980",
    genre: "New Wave, Art Rock, Funk, Afrobeat",
    label: "Sire",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Born Under Punches (The Heat Goes On)", "Crosseyed and Painless",
      "The Great Curve", "Once in a Lifetime", "Houses in Motion",
      "Seen and Not Seen", "Listening Wind", "The Overload"
    ]
  },

  // Post-punk
  {
    title: "Unknown Pleasures",
    artist: "Joy Division",
    year: "1979",
    genre: "Post-punk, Alternative Rock, Gothic Rock",
    label: "Factory",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Disorder", "Day of the Lords", "Candidate", "Insight",
      "New Dawn Fades", "She's Lost Control", "Shadowplay",
      "Wilderness", "Interzone", "I Remember Nothing"
    ]
  },
  {
    title: "Power, Corruption & Lies",
    artist: "New Order",
    year: "1983",
    genre: "New Wave, Synth-pop, Post-punk, Electronic",
    label: "Factory",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Age of Consent", "We All Stand", "The Village", "5 8 6",
      "Your Silent Face", "Ultraviolence", "Ecstasy", "Leave Me Alone"
    ]
  },

  // Soul / Funk
  {
    title: "Songs in the Key of Life",
    artist: "Stevie Wonder",
    year: "1976",
    genre: "Soul, Funk, Pop, R&B",
    label: "Motown",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Love's in Need of Love Today", "Have a Talk with God", "Village Ghetto Land",
      "Contusion", "Sir Duke", "I Wish", "Knocks Me Off My Feet",
      "Pastime Paradise", "Summer Soft", "Ordinary Pain",
      "Isn't She Lovely", "Joy Inside My Tears", "Black Man",
      "Ngiculela – Es Una Historia – I Am Singing", "If It's Magic",
      "As", "Another Star"
    ]
  },
  {
    title: "What's Going On",
    artist: "Marvin Gaye",
    year: "1971",
    genre: "Soul, R&B, Psychedelic Soul",
    label: "Tamla",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "What's Going On", "What's Happening Brother", "Flyin' High (In the Friendly Sky)",
      "Save the Children", "God Is Love", "Mercy Mercy Me (The Ecology)",
      "Right On", "Wholy Holy", "Inner City Blues (Make Me Wanna Holler)"
    ]
  },
  {
    title: "Innervisions",
    artist: "Stevie Wonder",
    year: "1973",
    genre: "Soul, Funk, R&B, Progressive Soul",
    label: "Tamla",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Too High", "Visions", "Living for the City", "Golden Lady",
      "Higher Ground", "Jesus Children of America", "All in Love Is Fair",
      "Don't You Worry 'Bout a Thing", "He's Misstra Know-It-All"
    ]
  },

  // Metal
  {
    title: "Master of Puppets",
    artist: "Metallica",
    year: "1986",
    genre: "Thrash Metal, Heavy Metal",
    label: "Elektra",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Battery", "Master of Puppets", "The Thing That Should Not Be",
      "Welcome Home (Sanitarium)", "Disposable Heroes", "Leper Messiah",
      "Orion", "Damage, Inc."
    ]
  },
  {
    title: "Paranoid",
    artist: "Black Sabbath",
    year: "1970",
    genre: "Heavy Metal, Hard Rock",
    label: "Vertigo",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "War Pigs", "Paranoid", "Planet Caravan", "Iron Man",
      "Electric Funeral", "Hand of Doom", "Rat Salad", "Fairies Wear Boots"
    ]
  },
  {
    title: "Rust in Peace",
    artist: "Megadeth",
    year: "1990",
    genre: "Thrash Metal, Heavy Metal, Progressive Metal",
    label: "Capitol",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Holy Wars... The Punishment Due", "Hangar 18", "Take No Prisoners",
      "Five Magics", "Poison Was the Cure", "Lucretia",
      "Tornado of Souls", "Dawn Patrol", "Rust in Peace... Polaris"
    ]
  },

  // Experimental / Art Pop
  {
    title: "Homogenic",
    artist: "Björk",
    year: "1997",
    genre: "Electronic, Art Pop, Experimental, Trip Hop",
    label: "One Little Indian",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Hunter", "Jóga", "Unravel", "Bachelorette", "All Neon Like",
      "5 Years", "Immature", "Alarm Call", "Pluto", "All Is Full of Love"
    ]
  },
  {
    title: "Vespertine",
    artist: "Björk",
    year: "2001",
    genre: "Electronic, Art Pop, Ambient, Glitch",
    label: "One Little Indian",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Hidden Place", "Cocoon", "It's Not Up to You", "Undo",
      "Pagan Poetry", "Frosti", "Aurora", "An Echo, a Stain",
      "Sun in My Mouth", "Heirloom", "Harm of Will", "Unison"
    ]
  },

  // Additional genre crossovers
  {
    title: "Loveless",
    artist: "My Bloody Valentine",
    year: "1991",
    genre: "Shoegaze, Alternative Rock, Noise Pop, Dream Pop",
    label: "Creation",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Only Shallow", "Loomer", "Touched", "To Here Knows When",
      "When You Sleep", "I Only Said", "Come in Alone", "Sometimes",
      "Blown a Wish", "What You Want", "Soon"
    ]
  },
  {
    title: "Spiderland",
    artist: "Slint",
    year: "1991",
    genre: "Post-rock, Math Rock, Indie Rock",
    label: "Touch and Go",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Breadcrumb Trail", "Nosferatu Man", "Don, Aman",
      "Washer", "For Dinner...", "Good Morning, Captain"
    ]
  },
  {
    title: "Madvillainy",
    artist: "Madvillain",
    year: "2004",
    genre: "Hip Hop, Alternative Hip Hop, Jazz Rap",
    label: "Stones Throw",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "The Illest Villains", "Accordion", "Meat Grinder", "Bistro",
      "Raid", "America's Most Blunted", "Sickfit (Instrumental)",
      "Rainbows", "Curls", "Do Not Fire! (Instrumental)", "Money Folder",
      "Shadows of Tomorrow", "Operation Lifesaver AKA Mint Test",
      "Figaro", "Hardcore Hustle", "Strange Ways", "Fancy Clown",
      "Eye", "Supervillain Theme (Instrumental)", "All Caps",
      "Great Day", "Rhinestone Cowboy"
    ]
  },
  {
    title: "In the Aeroplane Over the Sea",
    artist: "Neutral Milk Hotel",
    year: "1998",
    genre: "Indie Rock, Psychedelic Folk, Lo-fi",
    label: "Merge",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "The King of Carrot Flowers, Pt. One", "The King of Carrot Flowers, Pts. Two & Three",
      "In the Aeroplane Over the Sea", "Two-Headed Boy", "The Fool",
      "Holland, 1945", "Communist Daughter", "Oh Comely",
      "Ghost", "Untitled", "Two-Headed Boy, Pt. Two"
    ]
  },
  {
    title: " Lift Your Skinny Fists Like Antennas to Heaven",
    artist: "Godspeed You! Black Emperor",
    year: "2000",
    genre: "Post-rock, Experimental, Drone, Ambient",
    label: "Constellation",
    coverUrl: "https://i.scdn.co/image/ab67616d0000b2735c5c5c5c5c5c5c5c5c5c5c5c",
    tracks: [
      "Storm", "Static", "Sleep", "Like Antennas to Heaven..."
    ]
  }
];

async function main() {
  console.log('🌱 Starting to seed data...');

  // Get or create default user
  const defaultEmail = 'dev@midai.local';
  let user = await prisma.user.findUnique({
    where: { email: defaultEmail }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: defaultEmail,
        name: 'Dev User',
      }
    });
    console.log('✅ Created default user');
  } else {
    console.log('✅ Using existing user');
  }

  // Clear existing albums and tracks for this user
  console.log('🗑️ Clearing existing data...');
  await prisma.track.deleteMany({ where: { userId: user.id } });
  await prisma.album.deleteMany({ where: { userId: user.id } });

  console.log(`📀 Creating ${albumsData.length} albums with tracks...`);

  let totalTracks = 0;

  for (const albumData of albumsData) {
    try {
      // Create album
      const album = await prisma.album.create({
        data: {
          title: albumData.title,
          artist: albumData.artist,
          releaseDate: albumData.year,
          genre: albumData.genre,
          label: albumData.label,
          coverUrl: albumData.coverUrl,
          userId: user.id,
        }
      });

      // Create tracks for this album
      for (const trackTitle of albumData.tracks) {
        await prisma.track.create({
          data: {
            title: trackTitle,
            artist: albumData.artist,
            albumName: albumData.title,
            releaseDate: albumData.year,
            genre: albumData.genre, // Inherit album's genre
            label: albumData.label,
            coverUrl: albumData.coverUrl,
            userId: user.id,
          }
        });
        totalTracks++;
      }

      console.log(`  ✅ ${albumData.title} - ${albumData.tracks.length} tracks`);
    } catch (error) {
      console.error(`  ❌ Failed: ${albumData.title}`, error);
    }
  }

  // Create some standalone tracks (not linked to albums in collection)
  const standaloneTracks = [
    { title: "Blinding Lights", artist: "The Weeknd", genre: "Synth-pop, R&B, Electropop", albumName: "After Hours" },
    { title: "Bohemian Rhapsody", artist: "Queen", genre: "Progressive Rock, Art Rock, Operatic Pop", albumName: "A Night at the Opera" },
    { title: "Smells Like Teen Spirit", artist: "Nirvana", genre: "Grunge, Alternative Rock", albumName: "Nevermind" },
    { title: "Hotel California", artist: "Eagles", genre: "Rock, Soft Rock", albumName: "Hotel California" },
    { title: "Sweet Child O' Mine", artist: "Guns N' Roses", genre: "Hard Rock, Glam Metal", albumName: "Appetite for Destruction" },
    { title: "Imagine", artist: "John Lennon", genre: "Soft Rock, Pop", albumName: "Imagine" },
    { title: "Like a Rolling Stone", artist: "Bob Dylan", genre: "Folk Rock, Rock", albumName: "Highway 61 Revisited" },
    { title: "Hey Jude", artist: "The Beatles", genre: "Rock, Pop Rock", albumName: "Hey Jude (single)" },
    { title: "What's Going On", artist: "Marvin Gaye", genre: "Soul, R&B, Psychedelic Soul", albumName: "What's Going On" },
    { title: "Respect", artist: "Aretha Franklin", genre: "Soul, R&B", albumName: "I Never Loved a Man the Way I Love You" },
    { title: "Johnny B. Goode", artist: "Chuck Berry", genre: "Rock and Roll, Rhythm and Blues", albumName: "Johnny B. Goode (single)" },
    { title: "Good Vibrations", artist: "The Beach Boys", genre: "Psychedelic Pop, Art Pop, Progressive Pop", albumName: "Smile Sessions" },
    { title: "Stairway to Heaven", artist: "Led Zeppelin", genre: "Hard Rock, Folk Rock", albumName: "Led Zeppelin IV" },
    { title: "What's Love Got to Do with It", artist: "Tina Turner", genre: "Pop Rock, Dance-pop", albumName: "Private Dancer" },
    { title: "I Want to Break Free", artist: "Queen", genre: "Pop Rock, Synth-pop", albumName: "The Works" },
    { title: "Billie Jean", artist: "Michael Jackson", genre: "Post-disco, R&B, Funk", albumName: "Thriller" },
    { title: "Superstition", artist: "Stevie Wonder", genre: "Funk, Soul", albumName: "Talking Book" },
    { title: "Losing My Religion", artist: "R.E.M.", genre: "Alternative Rock, Folk Rock", albumName: "Out of Time" },
    { title: "Creep", artist: "Radiohead", genre: "Alternative Rock, Grunge", albumName: "Pablo Honey" },
    { title: "Seven Nation Army", artist: "The White Stripes", genre: "Garage Rock, Alternative Rock", albumName: "Elephant" },
  ];

  console.log(`\n🎵 Creating ${standaloneTracks.length} additional standalone tracks...`);

  for (const track of standaloneTracks) {
    try {
      await prisma.track.create({
        data: {
          title: track.title,
          artist: track.artist,
          albumName: track.albumName,
          genre: track.genre,
          userId: user.id,
        }
      });
      totalTracks++;
      console.log(`  ✅ ${track.title} - ${track.artist}`);
    } catch (error) {
      console.error(`  ❌ Failed: ${track.title}`, error);
    }
  }

  console.log('\n🎉 Seeding completed!');
  console.log(`📊 Summary:`);
  console.log(`   Albums: ${albumsData.length}`);
  console.log(`   Tracks: ${totalTracks}`);
  console.log(`   Total Items: ${albumsData.length + totalTracks}`);
  
  // Count unique genres
  const allGenres = new Set<string>();
  albumsData.forEach(a => a.genre.split(',').forEach(g => allGenres.add(g.trim())));
  standaloneTracks.forEach(t => t.genre.split(',').forEach(g => allGenres.add(g.trim())));
  console.log(`   Unique Genres: ${allGenres.size}`);
  console.log(`   Genres: ${Array.from(allGenres).sort().join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
