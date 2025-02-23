from crewai import Agent, Task, Crew, Process
from textwrap import dedent
from typing import List, Dict, Type
import time
from crewai.tools import BaseTool
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

def get_user_input(question: str) -> str:
    """Helper function to get user input with proper formatting"""
    print("\n👩‍🍳 Chef needs clarification:")
    print(f"❓ {question}")
    return input("Your answer: ").strip()

# Define input schema for AskUserTool
class AskUserInput(BaseModel):
    question: str = Field(..., description="Question to ask the user.")

# Custom AskUserTool inheriting from BaseTool
class AskUserTool(BaseTool):
    name: str = "ask_user"
    description: str = "Ask the user for clarification or confirmation"
    args_schema: Type[BaseModel] = AskUserInput
    func: callable = get_user_input # Keep the original function for now, we'll adapt _run

    class Config:
        arbitrary_types_allowed = True

    def _run(self, question: str) -> str:
        """Asks the user a question and returns their response."""
        return self.func(question) # Call the get_user_input function

class CookingCrew:
    def __init__(self):
        # Initialize the agents
        self.head_chef = Agent(
            role='Head Chef',
            goal='Coordinate cooking activities and ensure successful recipe execution',
            backstory=dedent("""
                You are an experienced head chef with excellent communication skills.
                Your main responsibility is to guide the cook through the recipe while
                coordinating with other specialized agents. You're patient, clear in your
                instructions, and always ready to help.
                
                When you need clarification:
                1. Ask specific, clear questions
                2. Wait for the user's response
                3. Adapt your instructions based on their answer
                
                Always maintain a friendly and supportive tone.
            """),
            verbose=True,
            allow_delegation=True,
            tools=[
                AskUserTool()
            ]
        )

        self.ingredient_substituter = Agent(
            role='Ingredient Substitution Specialist',
            goal='Find the best possible substitutions for ingredients',
            backstory=dedent("""
                You are an expert in ingredient substitutions with deep knowledge of
                flavors, textures, and cooking chemistry. You can suggest the best
                alternatives based on available ingredients while maintaining the
                dish's integrity.
                
                When suggesting substitutions:
                1. Ask the user about specific dietary restrictions if relevant
                2. Confirm if suggested substitutions are available
                3. Explain why the substitution works well
            """),
            verbose=True,
            tools=[
                AskUserTool()
            ]
        )

        self.time_keeper = Agent(
            role='Kitchen Timer and Schedule Manager',
            goal='Track cooking times and manage multiple timing-dependent tasks',
            backstory=dedent("""
                You are responsible for managing all time-sensitive aspects of cooking.
                You keep track of multiple timers, remind about upcoming steps, and
                ensure nothing gets overcooked or forgotten.
                
                When managing time:
                1. Ask about user's cooking equipment if needed
                2. Confirm if specific timing instructions are clear
                3. Check if user needs more time between steps
            """),
            verbose=True,
            tools=[
                AskUserTool()
            ]
        )

    def create_recipe_tasks(self, recipe: Dict, available_ingredients: List[str]) -> List[Task]:
        """
        Create tasks based on the recipe and available ingredients
        """
        tasks = []
        
        # Task for ingredient check and substitution
        tasks.append(
            Task(
                description=dedent(f"""
                    Review the recipe ingredients: {recipe['ingredients']}
                    Compare with available ingredients: {available_ingredients}
                    
                    For each ingredient that needs substitution:
                    1. Ask the user about dietary restrictions or preferences
                    2. Suggest alternatives and confirm their availability
                    3. Explain why the substitution would work well
                    
                    Communicate all findings to the Head Chef.
                    
                    Remember to use the ask_user tool when you need clarification about:
                    - Dietary restrictions
                    - Ingredient preferences
                    - Availability of specific substitutes
                """),
                agent=self.ingredient_substituter,
                expected_output="Ingredient substitutions and clarifications for the Head Chef."
            )
        )

        # Task for timing management
        tasks.append(
            Task(
                description=dedent(f"""
                    Review the recipe steps: {recipe['steps']}
                    
                    Before creating the timing schedule:
                    1. Ask about available cooking equipment if needed
                    2. Confirm if user has any time constraints
                    3. Check if user needs extra time between steps
                    
                    Then:
                    - Create a timing schedule for all steps
                    - Set up reminders for time-sensitive steps
                    - Keep the Head Chef informed of upcoming timing events
                    
                    Use the ask_user tool to clarify any timing-related questions about:
                    - Available equipment
                    - Time constraints
                    - Preferred pace of cooking
                """),
                agent=self.time_keeper,
                expected_output="Cooking time schedule and timing reminders."
            )
        )

        # Main cooking guidance task
        tasks.append(
            Task(
                description=dedent(f"""
                    Guide the cook through the recipe execution:
                    1. Review ingredient substitutions if any
                    2. Explain each step clearly
                    3. Coordinate with TimeKeeper for timing
                    4. Answer any questions from the cook
                    5. Provide technique tips and explanations
                    
                    Throughout the process:
                    - Ask for clarification when needed
                    - Confirm understanding of important steps
                    - Check if user needs more detailed explanations
                    
                    Recipe steps: {recipe['steps']}
                    
                    Use the ask_user tool whenever you need to:
                    - Clarify understanding
                    - Confirm technique execution
                    - Check if more explanation is needed
                    - Verify completion of critical steps
                """),
                agent=self.head_chef,
                expected_output="Step-by-step cooking guidance and answers to cook's questions."
            )
        )

        return tasks

    def execute_recipe(self, recipe: Dict, available_ingredients: List[str]):
        """
        Execute the recipe with the crew
        """
        print("\n👩‍🍳 Welcome to your interactive cooking assistant!")
        print("The crew will guide you through the recipe and ask questions when needed.")
        print("Please respond to their questions to get the best cooking experience.\n")
        
        # Create the crew
        crew = Crew(
            agents=[self.head_chef, self.ingredient_substituter, self.time_keeper],
            tasks=self.create_recipe_tasks(recipe, available_ingredients),
            process=Process.sequential  # Tasks will be executed in sequence
        )

        # Start the crew
        result = crew.kickoff()
        return result

# Example usage
if __name__ == "__main__":
    # Example recipe
    recipe = {
        "name": "Simple Pasta",
        "ingredients": [
            "500g pasta",
            "3 cloves garlic",
            "2 tablespoons olive oil",
            "Salt and pepper to taste",
            "Fresh basil"
        ],
        "steps": [
            "Boil water in a large pot",
            "Add salt to the water",
            "Cook pasta for 8-10 minutes",
            "Meanwhile, slice garlic and heat olive oil in a pan",
            "Sauté garlic until golden",
            "Drain pasta and mix with garlic oil",
            "Season with salt and pepper",
            "Garnish with fresh basil"
        ]
    }

    # Available ingredients
    available_ingredients = [
        "500g pasta",
        "2 cloves garlic",
        "2 tablespoons olive oil",
        "Salt and pepper",
        "Dried basil"  # Note: dried instead of fresh
    ]

    # Create and run the cooking crew
    cooking_crew = CookingCrew()
    result = cooking_crew.execute_recipe(recipe, available_ingredients)
    print("\n👩‍🍳 Cooking session completed!")
    print("Final notes from your crew:", result) 