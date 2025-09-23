


When calling games it seems to be passing the logged in userId to filter for the schedule page. Does this mean that any user can send in a different userId and get their list of games? Maybe it should just pull the list of games for the user by getting the user from the current jwt token

When adding a new game and using a template, it doesnt seem to add the players to the game. Also the template selection should be somewhere else, right now its in the middle which feels weird because the user would have already filled in part of the form

Mobile Issues: We should fix these without changing the layout for the desktop view
The add new game form runs off the right side of the screen a little
The manage past games tables runs off the right side of the screen
On the group settings tab, the public group selector is too compressed, it just looks like a circle and is not clear its a switch


When creating a new user from the admin portal have a checkbox to send a welcome email and/or text to the user, including a link to reset their password. 

Include a password reset option on the login screen




