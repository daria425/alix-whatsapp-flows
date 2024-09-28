const surveyConfig = {
  1: {
    2: {
      responseContent:
        "Great\n\nSection 1 of 7: About you\n\n1A) What stage of the Fat Macy’s programme are you at?\n\nREPLY With the Right number.\n\n1: Completing my trial period\n\n2: Completing my 200 hours of work experience\n\n3: I have completed 200 hours of work experience but not yet used my Move On Grant\n\n4: I used my Move On Grant less than 6 months ago\n\n5:I used my Move On Grant between 6 months and 2 years ago",
      responseType: "text",
      templateKey: null,
      question: "1A",
    },
    3: {
      responseContent: {
        templateVariables: "1B) Are you happy for us to record your name?",
      },
      responseType: "template",
      templateKey: "survey_1b",
      question: "1B",
    },
    4: {
      responseContent: {
        templateVariables:
          "1C) Are you happy for us to ask about your answers on this form?",
      },
      responseType: "template",
      templateKey: "survey_1c",
      question: "1C",
    },
  },
  2: {
    1: {
      responseContent: {
        templateVariables:
          "Great thank you.\n\nSection 2 of 7: Workplace training\n\nWhen answering these questions, think about the training hours you’ve completed in the restaurant or at events at other venues.\n\n2A) Have you completed any training with Fat Macy’s since March 2024?\n\nThis could include your trial sessions or any other sessions contributing to your 200 hours.  This can be at Sohaila, at events, or at the Lexington cafe",
      },
      responseType: "template",
      templateKey: "survey_2a",
      question: "2A",
    },
    2: {
      responseContent: {
        templateVariables:
          "2B) How would you rate the work experience and training part of the Fat Macy's Milestone Programme?",
      },
      responseType: "template",
      templateKey: "survey_2b",
      question: "2B",
    },
    3: {
      responseContent:
        "2C) Please complete this sentence using a voice note or text message:\n\n'When I think about my training hours with Fat Macy's, I feel...'",
      responseType: "text",
      templateKey: null,
      question: "2C",
    },
    4: {
      responseContent:
        "2D) Thank you for sharing. We often have sessions on the rota which we cannot fill. How could Fat Macy’s support you to complete more hours?\n\nPlease answer using a voice note or text message",
      responseType: "text",
      templateKey: null,
      question: "2D",
    },
  },
  3: {
    1: {
      responseContent: {
        templateVariables:
          "Thanks for sharing your thoughts!\n\nSection 3 of 7: The Lexington\n\n3A) Have you completed any training sessions with the Lexington?",
      },
      responseType: "template",
      templateKey: "survey_2a", //3A is same as 2A no need for new template here
      question: "3A",
    },
    2: {
      responseContent: {
        templateVariables:
          "When thinking about your answers to these questions, you should think about any sessions you have completed at Lexington and the Lexington staff.\n\n3B) How would you rate the training you have received from the Lexington team?",
      },
      responseType: "template",
      templateKey: "survey_2b",
      question: "3B",
    },
    3: {
      responseContent: {
        templateVariables:
          "3C) How would you rate your experience of communicating and working with the Lexington team generally?",
      },
      responseType: "template",
      templateKey: "survey_2b",
      question: "3C",
    },
    4: {
      responseContent:
        "3D) Please complete this sentence using a voice note or text message:\n\n'When I think about my sessions with Lexington, I feel...'",
      responseType: "text",
      templateKey: null,
      question: "3D",
    },
  },
  4: {
    1: {
      responseContent: {
        templateVariables:
          "Thanks for sharing your thoughts!\n\nSection 4 of 7: Support from Fat Macy's\n\nWhen answering these questions, think about the support you've received from your Progression & Engagement Officer or anyone else on the charity team.\n\n4A) How would you rate the support you receive from the Progression & Engagement Team?",
      },
      responseType: "template",
      templateKey: "survey_2b",
      question: "4A", //is a list cant skip this one
    },
    2: {
      responseContent:
        "4B) Please complete this sentence using a voice note or text message:\n\n'When I think about the 1:1 support I've received from Fat Macy's, I feel...'",
      responseType: "text",
      templateKey: null,
      question: "4B",
    },
  },
  5: {
    1: {
      responseContent: {
        templateVariables:
          "Thanks for sharing your thoughts 🥰\n\nSection 5 of 7: Applying for Grants\n\n5A) Have you applied for your Housing Deposit Grant yet?",
      },
      responseType: "template",
      templateKey: "survey_2a",
      question: "5A",
    },
    2: {
      responseContent: {
        templateVariables:
          "5B) How would you rate your experience of applying for your Housing Deposit Grant?",
      },
      responseType: "template",
      templateKey: "survey_2b",
      question: "5B",
    },
    3: {
      responseContent:
        "5C) Please answer the following using a voice note or text message:\n\n1. What is / was helpful about the application process?\n2. How could we improve the application process?",
      responseType: "text",
      templateKey: null,
      question: "5C",
    },
  },
  6: {
    1: {
      responseContent: {
        templateVariables:
          "Thanks for sharing your thoughts 🥰\n\nSection 6 of 7: Communication with Fat Macy’s\n\n6A) How would you rate your experience of communicating and working with the Fat Macy's Team generally?\n\nWhen answering this question, you should consider your communication with all the staff - charity and restaurant team members.",
      },
      responseType: "template",
      templateKey: "survey_2b",
      question: "6A",
    },
    2: {
      responseContent:
        "6B) Please complete this sentence using a voice note or text:\n\n'When I think about the the Fat Macy's team, I feel...'",
      responseType: "text",
      templateKey: null,
      question: "6B",
    },
    3: {
      responseContent: {
        templateVariables:
          "6C) How would you rate the way Fat Macy's shares information about the programme and the services it offers?",
      },
      responseType: "template",
      templateKey: "survey_2b",
      question: "6C",
    },
    4: {
      responseContent:
        "6D) Which of these Fat Macy’s services are you aware of?\n\nPlease REPLY separating the numbers of services with a comma, i.e: '1,2,'\n\n1. Counselling\n\n2. Life coaching\n\n3. Career mentoring\n\n4. CV and interview workshops\n\n5. Benefits and budgeting advice\n\n6. Day trips and social events",
      responseType: "text",
      templateKey: null,
      question: "6D",
    },
    5: {
      responseContent:
        "6E) Do you read the monthly Fat Macy’s Trainee Newsletter? \n\nREPLY With the Right number.\n\n1: I didn't know there was a newsletter\n\n2: I knew about the newsletter, but I don't ever read it\n\n3: I skim the newsletter, but don't read it in detail\n\n4: I sometimes read the newsletter \n\n5: I always read the newsletter",
      responseType: "text",
      templateKey: null,
      question: "6E",
    },
    6: {
      responseContent:
        "6F) Fat Macy's tries to share stories about our current trainees.\n\nPlease complete this sentence using a voice note or text message:\n\n'When I read/hear stories about other trainees' successes, I feel...'",
      responseType: "text",
      templateKey: null,
      question: "6F",
    },
  },
  7: {
    1: {
      responseContent: {
        templateVariables:
          "Thanks for sharing your thoughts 🥰\n\nSection 7 of 7: Final reflections\n\n7A) Please choose how much you agree with 'I feel a sense of belonging at Fat Macy’s'",
      },
      responseType: "template",
      templateKey: "survey_7a",
      question: "7A",
    },
    2: {
      responseContent: {
        templateVariables:
          "7B) Please choose how much you agree with 'I feel able to bring my authentic self to Fat Macy’s'",
      },
      responseType: "template",
      templateKey: "survey_7a",
      question: "7B",
    },
    3: {
      responseContent: {
        templateVariables:
          "7C) Please choose how much you agree with 'I feel like my voice matters at Fat Macy's'",
      },
      responseType: "template",
      templateKey: "survey_7a",
      question: "7C",
    },
    4: {
      responseContent:
        "7D) Please answer the following using a voice note or text message:\n\n1. What has worked well during your time at Fat Macy’s\n2. What hasn’t worked well?\n3.How could we improve the trainee and graduate experience at Fat Macy’s?",
      responseType: "text",
      templateKey: null,
      question: "7D",
    },
    5: {
      responseContent: {
        templateVariables:
          "7E) How likely are you to recommend Fat Macy’s to a friend?",
      },
      responseType: "template",
      templateKey: "survey_7e",
      question: "7E",
    },
    6: {
      responseContent:
        "Thanks so much for completing this survey!\n\nYour feedback is really appreciated.  It's really important that we listen to what you have to share 🥰 \n\nWe will share the results of the survey and the changes we will make at Fat Macy's in November.\n\nGet in touch if there is anything we can help with!",
      responseType: "text",
      templateKey: null,
    },
  },
};

module.exports = {
  surveyConfig,
};
