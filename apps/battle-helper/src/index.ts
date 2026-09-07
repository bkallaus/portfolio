import { BattleStreams, RandomPlayerAI, Teams } from '@pkmn/sim';
import { TeamGenerators } from '@pkmn/randoms';

// Configure the team generator
Teams.setGeneratorFactory(TeamGenerators);

const runSimulation = async () => {
  // Initialize battle stream
  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  const spec = { formatid: 'gen9randombattle' };

  // Generate random teams for the specified format
  const p1spec = { name: 'Bot 1', team: Teams.pack(Teams.generate('gen9randombattle')) };
  const p2spec = { name: 'Bot 2', team: Teams.pack(Teams.generate('gen9randombattle')) };

  // Initialize AI for both players
  const p1 = new RandomPlayerAI(streams.p1);
  const p2 = new RandomPlayerAI(streams.p2);

  // Start the AI bots
  void p1.start();
  void p2.start();

  // Read from the omniscient stream to track battle progress
  const captureStream = async () => {
    for await (const chunk of streams.omniscient) {
      console.log(chunk);
      if (chunk.includes('|win|')) {
        console.log('Battle concluded!');
      }
    }
  };
  
  void captureStream();

  // Start the battle simulation
  void streams.omniscient.write(`>start ${JSON.stringify(spec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}`);
};

runSimulation().catch(console.error);
