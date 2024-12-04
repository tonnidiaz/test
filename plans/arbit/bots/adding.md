## Adding a bot task

### If bot is non-ws
     - Add a new ITask to global taskManager
     - With interval set to the bot's interval
     - When minute is reached, pause bot as well as task
     - Excecute callback
### else if bot is ws:
    - **Mega bot**
        - Iterate over child bots
        - Add each to Ws
        - If cond is met for bot, pause sibling bots
        - Excecute callback
        - Unpause