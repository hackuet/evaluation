//Storing the info that are needed for a LED
struct ledtask
  { 
   int pin; 
   unsigned long interval, previoustime;
   bool state; 
   };

ledtask leds[]=
{ 
  //Here, you can just add the required LED's info and then just practically implement them 

  {8,700,0,LOW}, 
  {9,2500,0,LOW}, 
  {10,1700,0,LOW}, 
  {13,1200,LOW} 

}; 
  
const int led_count= sizeof(leds) / sizeof(leds[0]); 

void setup()
{ 
  
  for(int i=0; i<led_count; i++){ 
    //pinMode(leds[i].pin, OUTPUT);

    //For D8, -8 
    DDRB |= (1 << (leds[i].pin - 8));
     
    } 
} 


void loop()
{ 
  
  unsigned long currenttime=millis(); 
  
  for(int i=0; i<led_count; i++)
  { 
    
    if(currenttime - leds[i].previoustime >= leds[i].interval)
    { 
      
      leds[i].previoustime= currenttime; 
      leds[i].state=!leds[i].state; 
      //digitalWrite(leds[i].pin,leds[i].state); 

      if(leds[i].state){
        PORTB |= (1 << (leds[i].pin - 8));

      }
      else{
        PORTB ^= (1 << (leds[i].pin -8));
      }

      

    } 
  } 
}