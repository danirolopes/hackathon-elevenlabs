"""
Process food inventory from images using OpenAI's vision model.
Generates a structured JSON output with aggregated quantities.
"""

import argparse
import base64
import json
import logging
import os
import re
from typing import Dict, List, Optional

from dotenv import load_dotenv
from openai import OpenAI, APIConnectionError, APIError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configuration constants
DEFAULT_MODEL = "gpt-4o-mini"
DEFAULT_TEMPERATURE = 0.25
DEFAULT_MAX_TOKENS = 1024


class FoodInventoryProcessor:
    """Process food inventory from images using AI vision capabilities."""
    
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key=self._get_api_key())
        
    def _get_api_key(self) -> str:
        """Retrieve and validate OpenAI API key."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY not found in environment variables")
            raise ValueError("Missing OPENAI_API_KEY in environment")
        return api_key

    @staticmethod
    def encode_image(image_path: str) -> str:
        """Encode image to base64 string with error handling."""
        if not os.path.exists(image_path):
            logger.error(f"Image file not found: {image_path}")
            raise FileNotFoundError(f"Image path does not exist: {image_path}")
            
        try:
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode("utf-8")
        except Exception as e:
            logger.error(f"Error encoding image: {str(e)}")
            raise

    def _call_vision_api(
        self,
        base64_image: str,
        model: str = DEFAULT_MODEL,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS
    ) -> str:
        """Call OpenAI vision API with error handling."""
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "List ONLY visible food items. Format: \"Nx Item\".\n"
                            "If uncertain about quantity, use 1x. One item per line.\n"
                            "Example:\n2x Milk\n3x Apples"
                        )
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            return response.choices[0].message.content
        except (APIConnectionError, APIError) as e:
            logger.error(f"API connection failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error during API call: {str(e)}")
            raise

    @staticmethod
    def _parse_response(response_text: str) -> List[Dict[str, str]]:
        """Parse and aggregate API response with validation."""
        aggregated_items: Dict[str, int] = {}
        original_names: Dict[str, str] = {}

        for line in response_text.split('\n'):
            line = line.strip()
            if not line:
                continue

            # Extract quantity and name with pattern matching
            match = re.match(r"(?i)(\d+)x\s+(.+)", line)
            if not match:
                logger.warning(f"Skipping malformed line: {line}")
                continue

            quantity = int(match.group(1))
            original_name = match.group(2).strip()
            normalized_name = original_name.lower()

            # Track original capitalization
            if normalized_name not in original_names:
                original_names[normalized_name] = original_name

            # Aggregate quantities
            aggregated_items[normalized_name] = (
                aggregated_items.get(normalized_name, 0) + quantity
            )

        return [
            {
                "quantity": quantity,
                "name": original_names[normalized_name]
            }
            for normalized_name, quantity in aggregated_items.items()
        ]

    def process_inventory(
        self,
        image_path: str,
        output_path: Optional[str] = None
    ) -> Dict:
        """Main processing pipeline."""
        try:
            logger.info(f"Processing image: {image_path}")
            base64_image = self.encode_image(image_path)
            
            logger.info("Calling vision API...")
            response_text = self._call_vision_api(base64_image)
            
            logger.info("Parsing response...")
            parsed_items = self._parse_response(response_text)
            
            output = {"identified_items": parsed_items}
            
            if output_path:
                with open(output_path, "w") as f:
                    json.dump(output, f, indent=2, ensure_ascii=False)
                logger.info(f"Output saved to: {output_path}")
            
            return output
            
        except Exception as e:
            logger.error(f"Processing failed: {str(e)}")
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Process food inventory from images"
    )
    parser.add_argument(
        "-i", 
        "--image-path",
        required=True,
        help="Path to input image file"
    )
    parser.add_argument(
        "-o",
        "--output-path",
        default="fridge_inventory.json",
        help="Path to output JSON file"
    )
    args = parser.parse_args()

    processor = FoodInventoryProcessor()
    result = processor.process_inventory(args.image_path, args.output_path)