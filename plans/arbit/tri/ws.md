# MAIN PLANS FOR TRIANGULAR ARBITRAGE BOT


## MEGA-BOT
### Schema:
- **mega** = true
- **children** = [ **TriArbitBot** ]
    - **ChildSchema:**
        - **type** = arbitrage
        - **is_child** = true
        - **parent** = bot
        - **arbit_settings.type** = tri
### Creation
- Loop through child_pairs
- Create **new ArbitBots** for with each child pair
- Add child-bot to bot.children 

### WS

- Each **child-bot** works like a seperate normal **tri-arbit 
- Add a **Boolean** to pause/resume all **child-bot** subs
parent bot**
- Sub to orderbook for each **child-bot** children
    - The **child-bot.child** with highest percentage pauses the all other **child-bot** subs
    - 