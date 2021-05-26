print("Let's get to know each other!")

Name = input("What is your name? ")
if Name.capitalize() == "Justin":
    print("Hey! That's my name too!")
else:
    print("Hello " + Name.capitalize() +  "! My name is Justin!")

while True:
    try:
        Age = int(input("What is your age? "))
    except ValueError:
        print("Sorry, I didn't understand that.")
        continue
    else:
        break

if Age >= 18:
    print(str(Age) + " is old enough!")

    Fun = input("What do you like to do for fun? ")
    print("That sounds like a blast!")
    print("I like to go for hikes with my family, personally.")

    Wurk = input("What is your dream job?")
    print("REALLY! ME TOO!")
    print(";D Just Kidding! I'm working my way to a nice desk job with air conditioning during the summers :D")

    print("I'm going to let you get back to what you were doing now.")
    print("I enjoyed talked to you and hope to do it again soon.")
    print("Have a Fantastic rest of your day! Goodbye!")
    
else:
    print(str(Age) + " is too young to be here.")
    print("Goodbye!")