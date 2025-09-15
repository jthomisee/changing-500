On my profile page
    show me stats across all my groups
        Num of Games
        Win Rate
        Avg Pos
        Total Winnings
        P&L
    My list of games across all groups (with a note showing which group each is from)


Setup the ability to schedule a future game with full rsvp and notification system. Use AWS pinpoint for text features
Sample SMS Flow
"You're invited to poker night Thu 7pm in the Texas Holden group. Reply YES or NO, or use link: https://yourapp.com/rsvp/abc123"

User replies: "YES"
System responds: "Great! You're confirmed for poker night Thu 7pm."
Consider rate limiting for SMS to avoid costs
Use SQS for reliable message processing

If a user has sms notifications enable they will get these messages

Configurable game specific options, like setting the buy in amount.

Add host/locations to games


Do I need pagination for the games list at some point?

Where else do I need pagination?

Make side bets user configurable

Login is slow

