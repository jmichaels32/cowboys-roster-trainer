(() => {
  const sources = {
    hofFacts: {
      title: "New England Patriots Team Facts — Pro Football Hall of Fame",
      url: "https://www.profootballhof.com/teams/new-england-patriots/team-facts",
    },
    hofHistory: {
      title: "New England Patriots Team History — Pro Football Hall of Fame",
      url: "https://www.profootballhof.com/teams/new-england-patriots/team-history",
    },
    superBowlXXXVI: {
      title: "Super Bowl XXXVI — New England Patriots",
      url: "https://www.patriots.com/press-room/super-bowl-xxxvi",
    },
    superBowlXLIX: {
      title: "Super Bowl XLIX — New England Patriots",
      url: "https://www.patriots.com/press-room/super-bowl-xlix",
    },
    superBowlLI: {
      title: "Super Bowl LI — New England Patriots",
      url: "https://www.patriots.com/press-room/super-bowl-li",
    },
    bradyBio: {
      title: "Tom Brady Official Patriots Bio",
      url: "https://www.patriots.com/news/tom-brady-bio",
    },
    gronkowski: {
      title: "Rob Gronkowski Patriots Hall of Fame Induction",
      url: "https://www.patriots.com/news/rob-gronkowski-induction-ceremony-to-be-held-on-saturday-november-7",
    },
    gillette: {
      title: "Gillette Stadium Renovations and History",
      url: "https://www.patriots.com/news/gillette-stadium-officials-provide-update-on-stadium-renovations-and-improvement",
    },
    hannah: {
      title: "Pro Football Hall of Fame Event at The Hall",
      url: "https://www.patriots.com/news/pro-football-hall-of-fame-to-hold-event-at-the-hall-146001",
    },
  };

  const images = {
    earlyPatriots: {
      path: "assets/trivia/patriots-early-team.webp",
      label: "Early Patriots",
      subject: "Players from the early Boston Patriots era",
      alt: "A group of early Boston Patriots players kneeling together in uniform",
      credit: "New England Patriots archive",
      sourceTitle: "57 Photos For 57 Years",
      sourceUrl: "https://www.patriots.com/photos/57-photos-for-57-years-279531",
      originalUrl: "https://res.cloudinary.com/nflclubs/image/private/t_new_photo_album/patriots/nzklabts4lwrduy5wjj4.jpg",
    },
    earlyGame: {
      path: "assets/trivia/patriots-early-game.webp",
      label: "Boston Patriots",
      subject: "An early Boston Patriots game",
      alt: "The Boston Patriots offense running a play in an early franchise game",
      credit: "New England Patriots archive",
      sourceTitle: "57 Photos For 57 Years",
      sourceUrl: "https://www.patriots.com/photos/57-photos-for-57-years-279531",
      originalUrl: "https://res.cloudinary.com/nflclubs/image/private/t_new_photo_album/patriots/ratk96c8vwu3tftkavki.jpg",
    },
    firstTitle: {
      path: "assets/trivia/patriots-super-bowl-xxxvi.webp",
      label: "Super Bowl XXXVI",
      subject: "The Patriots entering Super Bowl XXXVI",
      alt: "New England Patriots players entering the field before Super Bowl XXXVI",
      credit: "New England Patriots archive",
      sourceTitle: "Super Bowl XXXVI",
      sourceUrl: "https://www.patriots.com/press-room/super-bowl-xxxvi",
      originalUrl: "https://static.clubs.nfl.com/image/private/t_editorial_landscape_12_desktop/patriots/kqmovqt0omf9a5gn42ev.jpg",
    },
    fourthTitle: {
      path: "assets/trivia/patriots-super-bowl-xlix.webp",
      label: "Super Bowl XLIX",
      subject: "Patriots and Seahawks in Super Bowl XLIX",
      alt: "A New England Patriots player battling a Seattle Seahawks defender in Super Bowl XLIX",
      credit: "New England Patriots archive",
      sourceTitle: "Super Bowl XLIX",
      sourceUrl: "https://www.patriots.com/press-room/super-bowl-xlix",
      originalUrl: "https://static.clubs.nfl.com/image/private/t_editorial_landscape_12_desktop/patriots/di2dr65xl1mfjnnsx7on.jpg",
    },
    comeback: {
      path: "assets/trivia/patriots-super-bowl-li.webp",
      label: "Super Bowl LI",
      subject: "Tom Brady celebrating the Super Bowl LI comeback",
      alt: "Tom Brady raising the Lombardi Trophy after the Patriots won Super Bowl LI",
      credit: "New England Patriots archive",
      sourceTitle: "Super Bowl LI",
      sourceUrl: "https://www.patriots.com/press-room/super-bowl-li",
      originalUrl: "https://static.clubs.nfl.com/image/private/t_editorial_landscape_12_desktop/patriots/bbkedm0spgktgghfuozp.jpg",
    },
    johnHannah: {
      path: "assets/trivia/patriots-john-hannah.webp",
      label: "John Hannah",
      subject: "John Hannah and his Hall of Fame legacy",
      alt: "John Hannah in a Patriots uniform beside his Pro Football Hall of Fame bust",
      credit: "New England Patriots archive",
      sourceTitle: "Pro Football Hall of Fame Event at The Hall",
      sourceUrl: "https://www.patriots.com/news/pro-football-hall-of-fame-to-hold-event-at-the-hall-146001",
      originalUrl: "https://static.clubs.nfl.com/image/private/t_editorial_landscape_12_desktop/patriots/wd28voekc3agxggcjr8h",
    },
    tomBrady: {
      path: "assets/trivia/patriots-tom-brady.webp",
      label: "Tom Brady",
      subject: "Tom Brady during his Patriots career",
      alt: "Official New England Patriots portrait of Tom Brady",
      credit: "New England Patriots",
      sourceTitle: "Tom Brady Official Patriots Bio",
      sourceUrl: "https://www.patriots.com/news/tom-brady-bio",
      originalUrl: "https://static.clubs.nfl.com/image/private/t_editorial_landscape_12_desktop/patriots/eozs3relzx5k6ktynpny",
    },
    gronkowski: {
      path: "assets/trivia/patriots-rob-gronkowski.webp",
      label: "Rob Gronkowski",
      subject: "Rob Gronkowski scoring for New England",
      alt: "Rob Gronkowski holding the football while leaping into the end zone",
      credit: "New England Patriots archive",
      sourceTitle: "Best of Rob Gronkowski in photos",
      sourceUrl: "https://www.patriots.com/photos/best-of-rob-gronkowski-in-photos",
      originalUrl: "https://static.clubs.nfl.com/image/private/t_new_photo_album_2x/f_auto/patriots/iodokgar3gtbnbnhhmmz.jpg",
    },
    gilletteStadium: {
      path: "assets/trivia/patriots-gillette-stadium.webp",
      label: "Gillette Stadium",
      subject: "Gillette Stadium and its lighthouse",
      alt: "Gillette Stadium plaza with the stadium lighthouse in Foxborough",
      credit: "New England Patriots / Gillette Stadium",
      sourceTitle: "Gillette Stadium Renovations and History",
      sourceUrl: "https://www.patriots.com/news/gillette-stadium-officials-provide-update-on-stadium-renovations-and-improvement",
      originalUrl: "https://static.clubs.nfl.com/image/private/t_editorial_landscape_12_desktop/patriots/ydoo1chabi02sjymlj9g",
    },
  };

  const question = (id, pack, prompt, correct, accepted, distractors, detail, sourceId, evidence, imageId, imageCaption) => ({
    id: `patriots-${id}`,
    pack,
    label: pack === "super-bowls" ? "Super Bowls" : pack.charAt(0).toUpperCase() + pack.slice(1),
    prompt,
    correct,
    accepted,
    distractors,
    detail,
    sourceId,
    evidence,
    imageId,
    imageCaption,
  });

  const trivia = {
    meta: {
      updated: "2026-09-01",
      verificationStandard: "Every question must identify one authoritative source and paraphrase the supporting evidence.",
      sources,
      images,
    },
    packs: [
      { id: "mixed", title: "Mixed" },
      { id: "super-bowls", title: "Super Bowls" },
      { id: "history", title: "History" },
      { id: "legends", title: "Legends" },
      { id: "traditions", title: "Traditions" },
    ],
    questions: [
      question("championships", "super-bowls", "How many Super Bowls have the Patriots won?", "6", ["6", "six"], ["4", "5", "7"], "New England won Super Bowls XXXVI, XXXVIII, XXXIX, XLIX, LI, and LIII.", "hofFacts", "The Hall of Fame team facts list six Patriots Super Bowl championship seasons.", "comeback", "Tom Brady lifts the trophy after the franchise's fifth of six Super Bowl wins."),
      question("first-appearance", "super-bowls", "What was the Patriots’ first Super Bowl appearance?", "Super Bowl XX", ["super bowl xx", "xx", "20", "super bowl 20"], ["Super Bowl XV", "Super Bowl XXXI", "Super Bowl XXXVI"], "New England faced Chicago in Super Bowl XX after the 1985 season.", "hofFacts", "The Hall of Fame team facts identify Super Bowl XX as New England's first Super Bowl appearance.", "earlyGame", "The franchise's early decades led to its first Super Bowl appearance after the 1985 season."),
      question("first-title", "super-bowls", "Which Super Bowl gave New England its first championship?", "Super Bowl XXXVI", ["super bowl xxxvi", "xxxvi", "36", "super bowl 36"], ["Super Bowl XX", "Super Bowl XXXVIII", "Super Bowl XLIX"], "The Patriots won their first title after the 2001 season.", "hofFacts", "The Hall of Fame team facts identify Super Bowl XXXVI as the Patriots' first Super Bowl victory.", "firstTitle", "The Patriots enter the field before winning their first championship in Super Bowl XXXVI."),
      question("first-title-opponent", "super-bowls", "Who did the Patriots beat for their first Super Bowl title?", "St. Louis Rams", ["st louis rams", "st. louis rams", "rams"], ["Chicago Bears", "Carolina Panthers", "Philadelphia Eagles"], "New England defeated St. Louis 20–17 in Super Bowl XXXVI.", "superBowlXXXVI", "The official game history records a 20–17 Patriots win over the St. Louis Rams.", "firstTitle", "New England's Super Bowl XXXVI entrance preceded its first title, a win over St. Louis."),
      question("first-title-score", "super-bowls", "What was the final score of the Patriots’ first Super Bowl win?", "20–17", ["20-17", "20–17", "20 to 17"], ["24–21", "28–24", "13–3"], "Adam Vinatieri's field goal as time expired broke a 17–17 tie.", "superBowlXXXVI", "The official Super Bowl XXXVI history gives the final score as New England 20, St. Louis 17.", "firstTitle", "The Patriots beat the Rams 20–17 to capture their first Lombardi Trophy."),
      question("vinatieri-kick", "super-bowls", "Who kicked the game-winner in the Patriots’ first Super Bowl victory?", "Adam Vinatieri", ["adam vinatieri", "vinatieri"], ["Stephen Gostkowski", "Gino Cappelletti", "Matt Bahr"], "Vinatieri made a 48-yard field goal as time expired.", "superBowlXXXVI", "The official game history credits Adam Vinatieri's 48-yard field goal with the winning points.", "firstTitle", "Super Bowl XXXVI ended with Adam Vinatieri's 48-yard championship-winning field goal."),
      question("butler-interception", "super-bowls", "Who made the goal-line interception that sealed Super Bowl XLIX?", "Malcolm Butler", ["malcolm butler", "butler"], ["Devin McCourty", "Ty Law", "Dont’a Hightower"], "Butler intercepted Russell Wilson with 20 seconds remaining.", "superBowlXLIX", "The official Super Bowl XLIX history says Malcolm Butler intercepted the pass at the goal line with 20 seconds left.", "fourthTitle", "The Patriots and Seahawks met in Super Bowl XLIX, sealed by Malcolm Butler's interception."),
      question("li-comeback", "super-bowls", "How large was the Patriots’ Super Bowl LI comeback?", "25 points", ["25 points", "25", "twenty five points", "twenty-five points"], ["17 points", "21 points", "28 points"], "New England trailed Atlanta 28–3 before winning 34–28 in overtime.", "superBowlLI", "The official Super Bowl LI history records a comeback from a 25-point deficit.", "comeback", "Tom Brady celebrates after New England completed the 25-point comeback in Super Bowl LI."),

      question("original-name", "history", "What was the franchise originally called?", "Boston Patriots", ["boston patriots", "the boston patriots"], ["New England Minutemen", "Boston Colonials", "Massachusetts Patriots"], "The club played as the Boston Patriots before adopting New England in 1971.", "hofFacts", "The Hall of Fame team facts say the franchise began as the Boston Patriots.", "earlyPatriots", "These players represent the franchise's original Boston Patriots era."),
      question("first-season", "history", "What year did the Patriots begin play?", "1960", ["1960", "nineteen sixty"], ["1958", "1963", "1970"], "The Boston Patriots were one of the original American Football League teams.", "hofFacts", "The Hall of Fame team facts list 1960 as the franchise's first season.", "earlyGame", "An early Boston Patriots game recalls the franchise's inaugural 1960 season."),
      question("new-england-name", "history", "What year did the team become the New England Patriots?", "1971", ["1971", "nineteen seventy one", "nineteen seventy-one"], ["1966", "1970", "1976"], "The name changed when the team moved to its Foxborough stadium.", "hofFacts", "The Hall of Fame team facts state that the name changed to New England Patriots in 1971.", "earlyPatriots", "The Boston Patriots identity gave way to the New England name in 1971."),
      question("first-opponent", "history", "Who did the Patriots face in their first regular-season game?", "Denver Broncos", ["denver broncos", "broncos"], ["New York Titans", "Buffalo Bills", "Houston Oilers"], "Boston lost 13–10 to Denver on September 9, 1960.", "hofFacts", "The Hall of Fame team facts list Denver as the opponent in the franchise's first regular-season game.", "earlyGame", "The Boston Patriots began regular-season play against Denver in 1960."),
      question("first-win", "history", "Which team did the Patriots beat for their first win?", "New York Titans", ["new york titans", "ny titans", "titans"], ["Denver Broncos", "Buffalo Bills", "Oakland Raiders"], "Boston beat the New York Titans 28–24 on September 17, 1960.", "hofFacts", "The Hall of Fame team facts identify the New York Titans as the opponent in the franchise's first win.", "earlyGame", "The Boston Patriots earned their first victory during the inaugural 1960 season."),
      question("first-winning-season", "history", "What was the Patriots’ first winning season?", "1961", ["1961", "nineteen sixty one", "nineteen sixty-one"], ["1960", "1963", "1966"], "Boston finished 9–4–1 in its second season.", "hofFacts", "The Hall of Fame team facts list 1961 as the franchise's first winning season.", "earlyPatriots", "The young Boston Patriots posted the franchise's first winning record in 1961."),
      question("kraft-purchase", "history", "What year did Robert Kraft buy the Patriots?", "1994", ["1994", "nineteen ninety four", "nineteen ninety-four"], ["1989", "1992", "2000"], "Kraft purchased the franchise in January 1994.", "hofHistory", "The Hall of Fame team history says Robert Kraft purchased the team in January 1994.", "gilletteStadium", "Robert Kraft's ownership era ultimately brought the Patriots to Gillette Stadium."),

      question("first-hall-of-famer", "legends", "Who was the first Patriots player elected to the Pro Football Hall of Fame?", "John Hannah", ["john hannah", "hannah"], ["Andre Tippett", "Mike Haynes", "Gino Cappelletti"], "Hannah was enshrined in 1991 in his first year of eligibility.", "hannah", "The official Patriots article identifies John Hannah as the first Patriots player enshrined in Canton.", "johnHannah", "John Hannah became the first Patriots player elected to the Pro Football Hall of Fame."),
      question("passing-leader", "legends", "Who is the Patriots’ career passing leader?", "Tom Brady", ["tom brady", "brady"], ["Drew Bledsoe", "Steve Grogan", "Babe Parilli"], "Brady holds the franchise career records for passing yards and touchdowns.", "hofFacts", "The Hall of Fame team facts list Tom Brady as New England's career passing leader.", "tomBrady", "Tom Brady became the defining quarterback of the Patriots' championship era."),
      question("receptions-leader", "legends", "Who holds the Patriots’ career receptions record?", "Wes Welker", ["wes welker", "welker"], ["Julian Edelman", "Troy Brown", "Rob Gronkowski"], "Welker recorded 672 receptions for New England.", "hofFacts", "The Hall of Fame team facts list Wes Welker as the franchise leader with 672 receptions.", "tomBrady", "Tom Brady connected repeatedly with Wes Welker, the franchise's career receptions leader."),
      question("scoring-leader", "legends", "Who is the Patriots’ career scoring leader?", "Stephen Gostkowski", ["stephen gostkowski", "gostkowski"], ["Adam Vinatieri", "Gino Cappelletti", "Tom Brady"], "Gostkowski scored 1,775 points for New England.", "hofFacts", "The Hall of Fame team facts list Stephen Gostkowski as the Patriots' career scoring leader.", "gilletteStadium", "Stephen Gostkowski scored most of his franchise-record points at Gillette Stadium."),
      question("rushing-leader", "legends", "Who is the Patriots’ career rushing leader?", "Sam Cunningham", ["sam cunningham", "cunningham"], ["Jim Nance", "Corey Dillon", "Curtis Martin"], "Cunningham rushed for 5,453 yards with New England.", "hofFacts", "The Hall of Fame team facts list Sam Cunningham as the franchise's career rushing leader.", "earlyPatriots", "Sam Cunningham became the leading rusher in Patriots franchise history."),
      question("brady-draft", "legends", "At what overall pick did the Patriots draft Tom Brady?", "199th", ["199th", "199", "pick 199", "one hundred ninety ninth"], ["144th", "177th", "213th"], "New England selected Brady in the sixth round of the 2000 NFL Draft.", "bradyBio", "Brady's official Patriots bio says the club drafted him in the sixth round with pick 199.", "tomBrady", "The Patriots selected Tom Brady 199th overall in the 2000 NFL Draft."),
      question("gronk-touchdowns", "legends", "How many receiving touchdowns did Rob Gronkowski score in his record 2011 season?", "17", ["17", "seventeen"], ["13", "15", "19"], "His 17 receiving touchdowns set an NFL single-season record for a tight end.", "gronkowski", "The official Patriots induction article credits Gronkowski with an NFL tight-end record 17 receiving touchdowns in 2011.", "gronkowski", "Rob Gronkowski set the tight-end record with 17 receiving touchdowns in 2011."),

      question("home-city", "traditions", "In which Massachusetts town do the Patriots play home games?", "Foxborough", ["foxborough", "foxboro"], ["Boston", "Cambridge", "Worcester"], "The franchise has played in Foxborough since 1971.", "hofHistory", "The Hall of Fame team history places the Patriots' home stadiums in Foxborough beginning in 1971.", "gilletteStadium", "Gillette Stadium is the Patriots' home in Foxborough, Massachusetts."),
      question("stadium-opened", "traditions", "What year did Gillette Stadium open?", "2002", ["2002", "two thousand two"], ["1994", "2000", "2005"], "Gillette Stadium opened for the 2002 season.", "gillette", "The official stadium article states that Gillette Stadium opened in 2002.", "gilletteStadium", "Gillette Stadium opened in Foxborough in 2002."),
      question("nickname-selection", "traditions", "Who selected the original “Patriots” nickname?", "Boston sportswriters", ["boston sportswriters", "sportswriters", "boston sports writers"], ["The team owners", "A fan vote", "AFL officials"], "Local sportswriters chose Patriots from public contest submissions.", "hofHistory", "The Hall of Fame team history says Boston sportswriters selected Patriots from the most popular contest suggestions.", "earlyPatriots", "The Patriots name dates to the franchise's original Boston era."),
      question("retired-12", "traditions", "Whose number 12 is retired by the Patriots?", "Tom Brady", ["tom brady", "brady"], ["Babe Parilli", "Doug Flutie", "Drew Bledsoe"], "The franchise retired Brady's number 12 in 2024.", "hofFacts", "The Hall of Fame team facts include Tom Brady's number 12 among the Patriots' retired numbers.", "tomBrady", "Tom Brady's number 12 is retired by the New England Patriots."),
      question("retired-20", "traditions", "Whose number 20 is retired by the Patriots?", "Gino Cappelletti", ["gino cappelletti", "cappelletti"], ["Troy Brown", "Mike Haynes", "Kevin Faulk"], "Cappelletti starred as both a receiver and kicker for the Boston Patriots.", "hofFacts", "The Hall of Fame team facts include Gino Cappelletti's number 20 among the Patriots' retired numbers.", "earlyGame", "Gino Cappelletti was one of the defining stars of the Boston Patriots era."),
      question("first-playoff-win", "traditions", "Who did the Patriots beat in their first playoff game?", "Buffalo Bills", ["buffalo bills", "bills"], ["New York Jets", "Oakland Raiders", "Houston Oilers"], "Boston beat Buffalo 26–8 in the 1963 AFL Eastern Division playoff.", "hofFacts", "The Hall of Fame team facts record a 26–8 win over Buffalo in the franchise's first playoff appearance.", "earlyGame", "The Boston Patriots' first playoff trip included a victory over Buffalo in 1963."),
    ],
  };

  trivia.questions = trivia.questions.map((item) => {
    const source = sources[item.sourceId];
    const image = images[item.imageId];
    return {
      ...item,
      sourceTitle: source.title,
      sourceUrl: source.url,
      image: { ...image, caption: item.imageCaption },
      verifiedOn: trivia.meta.updated,
    };
  });

  window.PATRIOTS_TRIVIA = trivia;
})();
