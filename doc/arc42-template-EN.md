# 

**About arc42**

arc42, the template for documentation of software and system
architecture.

Template Version 8.2 EN. (based upon AsciiDoc version), January 2023

Created, maintained and © by Dr. Peter Hruschka, Dr. Gernot Starke and
contributors. See <https://arc42.org>.

<div class="note">

This version of the template contains some help and explanations. It is
used for familiarization with arc42 and the understanding of the
concepts. For documentation of your own system you use better the
*plain* version.

</div>

# Introduction and Goals

Describes the relevant requirements and the driving forces that software
architects and development team must consider. These include

- underlying business goals,

- essential features,

- essential functional requirements,

- quality goals for the architecture and

- relevant stakeholders and their expectations

DoKoHub is a mobile-first web application that allows users to record sessions of the german card game ["Doppelkopf" (wikipedia, german)](https://de.wikipedia.org/wiki/Doppelkopf).

Users create sessions and invite other users in order to track individual game scores.
A session consists of one or more actual games of Doppelkopf since tipically multiple games are played back to back.
This allows tracking scores over multiple games and reviewing various statistics about the played games.

DoKoHub **DOES NOT** implement the game Doppelkopf, it only allows tracking scores.

## Requirements Overview

> Note on Requirement Ids:
>
> - Fnn\[.x\]: Functional requirement
> - Qnn\[.x\]: Quality requirement
> - Lnn\[.x\]: Legal requirement

| Id    | Description             | Notes                                                                                                                                                                                                                       |
| ----- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01   | Game Session Management | Game sessions can be created and managed                                                                                                                                                                                    |
| F01.1 | Create Game Sessions    | Users can create new game sessions                                                                                                                                                                                          |
| F01.2 | Invite Other Users      | Users can invite other users to their session                                                                                                                                                                               |
| F01.3 | Remove Unwanted Users   | Malicious/Unknown users can be removed from a session                                                                                                                                                                       |
| F02   | Score Tracking          | Scores can be tracked per game per player                                                                                                                                                                                   |
| F02.1 | Special Scoring Rules   | All [official scoring rules (doko-verband.de, german)](https://doko-verband.de/regeln-und-ordnungen/) are supported.                                                                                                        |
| F02.2 | Score Totals            | Total scores over multiple games in a session are calculated and displayed                                                                                                                                                  |
| F03   | Game History            | To be discussed                                                                                                                                                                                                             |
| F04 | Reproducible deployment |  DoKoHub must be easily deployable on the target server |
| L01   | Open Source License     | DoKoHub is to be published under a permissible open-source license                                                                                                                                                          |
| L02   | Imprint                 | Any publicly reachable services must have an imprint. See [here (ihk.de, german)](https://www.ihk.de/chemnitz/recht-und-steuern/rechtsinformationen/internetrecht/pflichtangaben-im-internet-die-impressumspflicht-4401580) |

## Quality Goals

<!--
<div class="formalpara-title">

**Contents**

</div>

The top three (max five) quality goals for the architecture whose
fulfillment is of highest importance to the major stakeholders. We
really mean quality goals for the architecture. Don’t confuse them with
project goals. They are not necessarily identical.

Consider this overview of potential topics (based upon the ISO 25010
standard):

![Categories of Quality
Requirements](images/01_2_iso-25010-topics-EN.drawio.png)

<div class="formalpara-title">

**Motivation**

</div>

You should know the quality goals of your most important stakeholders,
since they will influence fundamental architectural decisions. Make sure
to be very concrete about these qualities, avoid buzzwords. If you as an
architect do not know how the quality of your work will be judged…

<div class="formalpara-title">

**Form**

</div>

A table with quality goals and concrete scenarios, ordered by priorities
-->

These quality goals are based on [ISO 25010](images/01_2_iso-25010-topics-EN.drawio.png)

| Quality Goal    | Description                                                             | Notes                                                            |
| --------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Usability       | System is easily understandable and attractive to users                 | UI must be intuitive to use and follow established UX guidelines |
| Maintainability | System is maintainable and extendable by current and future maintainers | DoKoHub is maintained primarily by students                      |
| Transferability | System can be transferred from one environment to another              | DoKoHub is expected to work on a wide range of mobile devices    |

## Stakeholders

<!--
<div class="formalpara-title">

**Contents**

</div>

Explicit overview of stakeholders of the system, i.e. all person, roles
or organizations that

- should know the architecture

- have to be convinced of the architecture

- have to work with the architecture or with code

- need the documentation of the architecture for their work

- have to come up with decisions about the system or its development

<div class="formalpara-title">

**Motivation**

</div>

You should know all parties involved in development of the system or
affected by the system. Otherwise, you may get nasty surprises later in
the development process. These stakeholders determine the extent and the
level of detail of your work and its results.

<div class="formalpara-title">

**Form**

</div>

Table with role names, person names, and their expectations with respect
to the architecture and its documentation.
-->

| Role/Name           | Contact                  | Expectations                                                                                                        |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Supervisor          | `le.brauner@ostfalia.de` | Functionality requirements are fulfilled and clearly documented; Regular status updates from developers.            |
| Developers          | *see github repo*        | Clearly defined requirements; constant feedback from other stakeholders; Up-to-date documentation                   |
| Deployment staff    | -                        | Clearly defined deployment procedures; reproducible software bundles; Monitoring capabilities                       |
| End User            | -                        | [Functional requirements](#requirements-overview) are fulfilled; Intuitive User Interface and fluid User Experience |
| External Maintainer | -                        | Clear documentation; quick-start guides and reproducible development environments.                                  |

# Architecture Constraints

<!--
<div class="formalpara-title">

**Contents**

</div>

Any requirement that constraints software architects in their freedom of
design and implementation decisions or decision about the development
process. These constraints sometimes go beyond individual systems and
are valid for whole organizations and companies.

<div class="formalpara-title">

**Motivation**

</div>

Architects should know exactly where they are free in their design
decisions and where they must adhere to constraints. Constraints must
always be dealt with; they may be negotiable, though.

<div class="formalpara-title">

**Form**

</div>

Simple tables of constraints with explanations. If needed you can
subdivide them into technical constraints, organizational and political
constraints and conventions (e.g. programming or versioning guidelines,
documentation or naming conventions)

See [Architecture Constraints](https://docs.arc42.org/section-2/) in the
arc42 documentation.
-->

| Constraint | Description                                 | Notes                                                                                                                | Consequences                                                     |
| ---------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| C01        | Mainly developed and maintained by students | Architecture and code must be kept as simple as possible. Complex requirements must be broken down to be accessible. |                                                                  |
| C02        | No budget for paid services                 | We must rely on free and open-source software (FOSS) and services.                                                   | Use of free tiers of cloud services, self-hosting, and FOSS.     |

# Context and Scope

<div class="formalpara-title">

**Contents**

</div>

Context and scope - as the name suggests - delimits your system (i.e.
your scope) from all its communication partners (neighboring systems and
users, i.e. the context of your system). It thereby specifies the
external interfaces.

If necessary, differentiate the business context (domain specific inputs
and outputs) from the technical context (channels, protocols, hardware).

<div class="formalpara-title">

**Motivation**

</div>

The domain interfaces and technical interfaces to communication partners
are among your system’s most critical aspects. Make sure that you
completely understand them.

<div class="formalpara-title">

**Form**

</div>

Various options:

- Context diagrams

- Lists of communication partners and their interfaces.

See [Context and Scope](https://docs.arc42.org/section-3/) in the arc42
documentation.

## Business Context

<div class="formalpara-title">

**Contents**

</div>

Specification of **all** communication partners (users, IT-systems, …)
with explanations of domain specific inputs and outputs or interfaces.
Optionally you can add domain specific formats or communication
protocols.

<div class="formalpara-title">

**Motivation**

</div>

All stakeholders should understand which data are exchanged with the
environment of the system.

<div class="formalpara-title">

**Form**

</div>

All kinds of diagrams that show the system as a black box and specify
the domain interfaces to communication partners.

Alternatively (or additionally) you can use a table. The title of the
table is the name of your system, the three columns contain the name of
the communication partner, the inputs, and the outputs.

| Communication Partner | Inputs to DoKoHub       | Outputs from DoKoHub |
| --------------------- | ----------------------- | -------------------- |
| Player                | Create new game session | Display leaderboard  |
|                       | Add/remove players      | Display game history |
|                       | Enter round results     | Confirm actions      |
|                       | Select rule set         |                      |

**\<optionally: Explanation of external domain interfaces>**

## Technical Context

<div class="formalpara-title">

**Contents**

</div>

Technical interfaces (channels and transmission media) linking your
system to its environment. In addition a mapping of domain specific
input/output to the channels, i.e. an explanation which I/O uses which
channel.

<div class="formalpara-title">

**Motivation**

</div>

Many stakeholders make architectural decision based on the technical
interfaces between the system and its context. Especially infrastructure
or hardware designers decide these technical interfaces.

<div class="formalpara-title">

**Form**

</div>

E.g. UML deployment diagram describing channels to neighboring systems,
together with a mapping table showing the relationships between channels
and input/output.

| From                          | To                            | Channel(s)       | Description                                                                                         |
| ----------------------------- | ----------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| Player's Device (Web Browser) | DoKoHub System (Backend)      | HTTPS (REST API) | For user actions (create game, enter scores)                                                        |
| DoKoHub System (Backend)      | Player's Device (Web Browser) | WSS (WebSockets) | For real-time score and leaderboard updates to fulfill constraint [C03](#architecture-constraints). |

**\<optionally: Explanation of technical interfaces>**

**\<Mapping Input/Output to Channels>**

# Solution Strategy

The following sections summarize the fundamental decisions and solution strategies for the DoKoHub application.

### Technology Approach

- **Frontend:** We will use a modern, component-based frontend framework that supports **TypeScript**. This will enable us to build a modular and maintainable user interface that is both responsive and user-friendly (addressing R01, R02, and R03).
- **Backend:** The backend will be built on a platform that supports **TypeScript** and provides robust capabilities for creating a REST API and a real-time communication server. This will allow us to fulfill the functional requirements and the real-time constraint C03.
- **Database:** We will use a relational database to store and manage game sessions, players, and scores. A relational model is well-suited for the structured data of our application. The choice of a specific database will be guided by constraint C02 (no budget for paid services).

### Architectural Pattern

- **Single Page Application (SPA) with a RESTful API:** The system will be structured as a SPA that communicates with the backend via a RESTful API for most operations. This is a mature and well-understood architectural pattern that provides a clear separation between the frontend and backend (R04).
- **Modular Backend:** To enhance maintainability (a key quality goal), the backend will be designed with a clear separation of concerns. We will create distinct modules for managing game sessions, users, and rule sets. This modular approach will make the system easier to understand and extend, which is crucial given constraint C01.

### Key Quality Goals

- **Maintainability:** The combination of TypeScript, a well-defined project structure, and a modular backend will be instrumental in achieving a high degree of maintainability.
- **Usability:** The choice of a suitable component-based framework will enable us to build a user-friendly and attractive interface, addressing the quality goal of Usability.

### Development Process

- **Agile with short iterations:** The project will be developed using an agile methodology with short iterations. This will allow for continuous feedback from stakeholders and the flexibility to adapt to changing requirements.

______________________________________________________________________

**TODO:** The specific technology stack (frontend framework, backend framework, database) needs to be decided. This decision should be based on the team's existing skills, the project's specific needs, and the constraints outlined in this document.

# Building Block View

<div class="formalpara-title">

**Content**

</div>

The building block view shows the static decomposition of the system
into building blocks (modules, components, subsystems, classes,
interfaces, packages, libraries, frameworks, layers, partitions, tiers,
functions, macros, operations, data structures, …) as well as their
dependencies (relationships, associations, …)

This view is mandatory for every architecture documentation. In analogy
to a house this is the *floor plan*.

<div class="formalpara-title">

**Motivation**

</div>

Maintain an overview of your source code by making its structure
understandable through abstraction.

This allows you to communicate with your stakeholder on an abstract
level without disclosing implementation details.

<div class="formalpara-title">

**Form**

</div>

The building block view is a hierarchical collection of black boxes and
white boxes (see figure below) and their descriptions.

![Hierarchy of building blocks](images/05_building_blocks-EN.png)

**Level 1** is the white box description of the overall system together
with black box descriptions of all contained building blocks.

**Level 2** zooms into some building blocks of level 1. Thus it contains
the white box description of selected building blocks of level 1,
together with black box descriptions of their internal building blocks.

**Level 3** zooms into selected building blocks of level 2, and so on.

See [Building Block View](https://docs.arc42.org/section-5/) in the
arc42 documentation.

## Whitebox Overall System

Here you describe the decomposition of the overall system using the
following white box template. It contains

- an overview diagram

- a motivation for the decomposition

- black box descriptions of the contained building blocks. For these
  we offer you alternatives:

  - use *one* table for a short and pragmatic overview of all
    contained building blocks and their interfaces

  - use a list of black box descriptions of the building blocks
    according to the black box template (see below). Depending on
    your choice of tool this list could be sub-chapters (in text
    files), sub-pages (in a Wiki) or nested elements (in a modeling
    tool).

- (optional:) important interfaces, that are not explained in the
  black box templates of a building block, but are very important for
  understanding the white box. Since there are so many ways to specify
  interfaces why do not provide a specific template for them. In the
  worst case you have to specify and describe syntax, semantics,
  protocols, error handling, restrictions, versions, qualities,
  necessary compatibilities and many things more. In the best case you
  will get away with examples or simple signatures.

***<Overview Diagram>***

Motivation
*<text explanation>*

Contained Building Blocks
*\<Description of contained building block (black boxes)>*

Important Interfaces
*<Description of important interfaces>*

Insert your explanations of black boxes from level 1:

If you use tabular form you will only describe your black boxes with
name and responsibility according to the following schema:

| **Name**         | **Responsibility** |
| ---------------- | ------------------ |
| *\<black box 1>* | *<Text>*           |
| *\<black box 2>* | *<Text>*           |

If you use a list of black box descriptions then you fill in a separate
black box template for every important building block . Its headline is
the name of the black box.

### \<Name black box 1>

Here you describe \<black box 1> according the the following black box
template:

- Purpose/Responsibility

- Interface(s), when they are not extracted as separate paragraphs.
  This interfaces may include qualities and performance
  characteristics.

- (Optional) Quality-/Performance characteristics of the black box,
  e.g.availability, run time behavior, ….

- (Optional) directory/file location

- (Optional) Fulfilled requirements (if you need traceability to
  requirements).

- (Optional) Open issues/problems/risks

*\<Purpose/Responsibility>*

*\<Interface(s)>*

*\<(Optional) Quality/Performance Characteristics>*

*\<(Optional) Directory/File Location>*

*\<(Optional) Fulfilled Requirements>*

*\<(optional) Open Issues/Problems/Risks>*

### \<Name black box 2>

*<black box template>*

### <Name black box n>

*<black box template>*

### \<Name interface 1>

…

### <Name interface m>

## Level 2

Here you can specify the inner structure of (some) building blocks from
level 1 as white boxes.

You have to decide which building blocks of your system are important
enough to justify such a detailed description. Please prefer relevance
over completeness. Specify important, surprising, risky, complex or
volatile building blocks. Leave out normal, simple, boring or
standardized parts of your system

### White Box *\<building block 1>*

…describes the internal structure of *building block 1*.

*<white box template>*

### White Box *\<building block 2>*

*<white box template>*

…

### White Box *<building block m>*

*<white box template>*

## Level 3

Here you can specify the inner structure of (some) building blocks from
level 2 as white boxes.

When you need more detailed levels of your architecture please copy this
part of arc42 for additional levels.

### White Box \<_building block x.1_>

Specifies the internal structure of *building block x.1*.

*<white box template>*

### White Box \<_building block x.2_>

*<white box template>*

### White Box \<_building block y.1_>

*<white box template>*

# Runtime View

<div class="formalpara-title">

**Contents**

</div>

The runtime view describes concrete behavior and interactions of the
system’s building blocks in form of scenarios from the following areas:

- important use cases or features: how do building blocks execute
  them?

- interactions at critical external interfaces: how do building blocks
  cooperate with users and neighboring systems?

- operation and administration: launch, start-up, stop

- error and exception scenarios

Remark: The main criterion for the choice of possible scenarios
(sequences, workflows) is their **architectural relevance**. It is
**not** important to describe a large number of scenarios. You should
rather document a representative selection.

<div class="formalpara-title">

**Motivation**

</div>

You should understand how (instances of) building blocks of your system
perform their job and communicate at runtime. You will mainly capture
scenarios in your documentation to communicate your architecture to
stakeholders that are less willing or able to read and understand the
static models (building block view, deployment view).

<div class="formalpara-title">

**Form**

</div>

There are many notations for describing scenarios, e.g.

- numbered list of steps (in natural language)

- activity diagrams or flow charts

- sequence diagrams

- BPMN or EPCs (event process chains)

- state machines

- …

See [Runtime View](https://docs.arc42.org/section-6/) in the arc42
documentation.

## \<Runtime Scenario 1>

- *<insert runtime diagram or textual description of the scenario>*

- \*<insert description of the notable aspects of the interactions
  between the building block instances depicted in this diagram.>

## \<Runtime Scenario 2>

## …

## <Runtime Scenario n>

# Deployment View

<div class="formalpara-title">

**Content**

</div>

The deployment view describes:

1. technical infrastructure used to execute your system, with
   infrastructure elements like geographical locations, environments,
   computers, processors, channels and net topologies as well as other
   infrastructure elements and

1. mapping of (software) building blocks to that infrastructure
   elements.

Often systems are executed in different environments, e.g. development
environment, test environment, production environment. In such cases you
should document all relevant environments.

Especially document a deployment view if your software is executed as
distributed system with more than one computer, processor, server or
container or when you design and construct your own hardware processors
and chips.

From a software perspective it is sufficient to capture only those
elements of an infrastructure that are needed to show a deployment of
your building blocks. Hardware architects can go beyond that and
describe an infrastructure to any level of detail they need to capture.

<div class="formalpara-title">

**Motivation**

</div>

Software does not run without hardware. This underlying infrastructure
can and will influence a system and/or some cross-cutting concepts.
Therefore, there is a need to know the infrastructure.

Maybe a highest level deployment diagram is already contained in section
3.2. as technical context with your own infrastructure as ONE black box.
In this section one can zoom into this black box using additional
deployment diagrams:

- UML offers deployment diagrams to express that view.
  Use it,
  probably with nested diagrams, when your infrastructure is more
  complex.

- When your (hardware) stakeholders prefer other kinds of diagrams
  rather than a deployment diagram, let them use any kind that is able
  to show nodes and channels of the infrastructure.

See [Deployment View](https://docs.arc42.org/section-7/) in the arc42
documentation.

## Infrastructure Level 1

Describe (usually in a combination of diagrams, tables, and text):

- distribution of a system to multiple locations, environments,
  computers, processors, .., as well as physical connections between
  them

- important justifications or motivations for this deployment
  structure

- quality and/or performance features of this infrastructure

- mapping of software artifacts to elements of this infrastructure

For multiple environments or alternative deployments please copy and
adapt this section of arc42 for all relevant environments.

***<Overview Diagram>***

Motivation
*<explanation in text form>*

Quality and/or Performance Features
*<explanation in text form>*

Mapping of Building Blocks to Infrastructure
*<description of the mapping>*

## Infrastructure Level 2

Here you can include the internal structure of (some) infrastructure
elements from level 1.

Please copy the structure from level 1 for each selected element.

### *\<Infrastructure Element 1>*

*\<diagram + explanation>*

### *\<Infrastructure Element 2>*

*\<diagram + explanation>*

…

### *<Infrastructure Element n>*

*\<diagram + explanation>*

# Cross-cutting Concepts

<div class="formalpara-title">

**Content**

</div>

This section describes overall, principal regulations and solution ideas
that are relevant in multiple parts (= cross-cutting) of your system.
Such concepts are often related to multiple building blocks. They can
include many different topics, such as

- models, especially domain models

- architecture or design patterns

- rules for using specific technology

- principal, often technical decisions of an overarching (=
  cross-cutting) nature

- implementation rules

<div class="formalpara-title">

**Motivation**

</div>

Concepts form the basis for *conceptual integrity* (consistency,
homogeneity) of the architecture. Thus, they are an important
contribution to achieve inner qualities of your system.

Some of these concepts cannot be assigned to individual building blocks,
e.g. security or safety.

<div class="formalpara-title">

**Form**

</div>

The form can be varied:

- concept papers with any kind of structure

- cross-cutting model excerpts or scenarios using notations of the
  architecture views

- sample implementations, especially for technical concepts

- reference to typical usage of standard frameworks (e.g. using
  Hibernate for object/relational mapping)

<div class="formalpara-title">

**Structure**

</div>

A potential (but not mandatory) structure for this section could be:

- Domain concepts

- User Experience concepts (UX)

- Safety and security concepts

- Architecture and design patterns

- "Under-the-hood"

- development concepts

- operational concepts

Note: it might be difficult to assign individual concepts to one
specific topic on this list.

![Possible topics for crosscutting
concepts](images/08-concepts-EN.drawio.png)

See [Concepts](https://docs.arc42.org/section-8/) in the arc42
documentation.

## *\<Concept 1>*

*<explanation>*

## *\<Concept 2>*

*<explanation>*

…

## *<Concept n>*

*<explanation>*

# Architecture Decisions

<div class="formalpara-title">

**Contents**

</div>

Important, expensive, large scale or risky architecture decisions
including rationales. With "decisions" we mean selecting one alternative
based on given criteria.

Please use your judgement to decide whether an architectural decision
should be documented here in this central section or whether you better
document it locally (e.g. within the white box template of one building
block).

Avoid redundancy. Refer to section 4, where you already captured the
most important decisions of your architecture.

<div class="formalpara-title">

**Motivation**

</div>

Stakeholders of your system should be able to comprehend and retrace
your decisions.

<div class="formalpara-title">

**Form**

</div>

Various options:

- ADR ([Documenting Architecture
  Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions))
  for every important decision

- List or table, ordered by importance and consequences or:

- more detailed in form of separate sections per decision

See [Architecture Decisions](https://docs.arc42.org/section-9/) in the
arc42 documentation. There you will find links and examples about ADR.

# Quality Requirements

<div class="formalpara-title">

**Content**

</div>

This section contains all quality requirements as quality tree with
scenarios. The most important ones have already been described in
section 1.2. (quality goals)

Here you can also capture quality requirements with lesser priority,
which will not create high risks when they are not fully achieved.

<div class="formalpara-title">

**Motivation**

</div>

Since quality requirements will have a lot of influence on architectural
decisions you should know for every stakeholder what is really important
to them, concrete and measurable.

See [Quality Requirements](https://docs.arc42.org/section-10/) in the
arc42 documentation.

## Quality Tree

<div class="formalpara-title">

**Content**

</div>

The quality tree (as defined in ATAM – Architecture Tradeoff Analysis
Method) with quality/evaluation scenarios as leafs.

<div class="formalpara-title">

**Motivation**

</div>

The tree structure with priorities provides an overview for a sometimes
large number of quality requirements.

<div class="formalpara-title">

**Form**

</div>

The quality tree is a high-level overview of the quality goals and
requirements:

- tree-like refinement of the term "quality". Use "quality" or
  "usefulness" as a root

- a mind map with quality categories as main branches

In any case the tree should include links to the scenarios of the
following section.

## Quality Scenarios

<div class="formalpara-title">

**Contents**

</div>

Concretization of (sometimes vague or implicit) quality requirements
using (quality) scenarios.

These scenarios describe what should happen when a stimulus arrives at
the system.

For architects, two kinds of scenarios are important:

- Usage scenarios (also called application scenarios or use case
  scenarios) describe the system’s runtime reaction to a certain
  stimulus. This also includes scenarios that describe the system’s
  efficiency or performance. Example: The system reacts to a user’s
  request within one second.

- Change scenarios describe a modification of the system or of its
  immediate environment. Example: Additional functionality is
  implemented or requirements for a quality attribute change.

<div class="formalpara-title">

**Motivation**

</div>

Scenarios make quality requirements concrete and allow to more easily
measure or decide whether they are fulfilled.

Especially when you want to assess your architecture using methods like
ATAM you need to describe your quality goals (from section 1.2) more
precisely down to a level of scenarios that can be discussed and
evaluated.

<div class="formalpara-title">

**Form**

</div>

Tabular or free form text.

# Risks and Technical Debts

<div class="formalpara-title">

**Contents**

</div>

A list of identified technical risks or technical debts, ordered by
priority

<div class="formalpara-title">

**Motivation**

</div>

“Risk management is project management for grown-ups” (Tim Lister,
Atlantic Systems Guild.)

This should be your motto for systematic detection and evaluation of
risks and technical debts in the architecture, which will be needed by
management stakeholders (e.g. project managers, product owners) as part
of the overall risk analysis and measurement planning.

<div class="formalpara-title">

**Form**

</div>

List of risks and/or technical debts, probably including suggested
measures to minimize, mitigate or avoid risks or reduce technical debts.

See [Risks and Technical Debt](https://docs.arc42.org/section-11/) in
the arc42 documentation.

# Glossary

<div class="formalpara-title">

**Contents**

</div>

The most important domain and technical terms that your stakeholders use
when discussing the system.

You can also see the glossary as source for translations if you work in
multi-language teams.

<div class="formalpara-title">

**Motivation**

</div>

You should clearly define your terms, so that all stakeholders

- have an identical understanding of these terms

- do not use synonyms and homonyms

A table with columns <Term> and <Definition>.

Potentially more columns in case you need translations.

See [Glossary](https://docs.arc42.org/section-12/) in the arc42
documentation.

| Term       | Definition       |
| ---------- | ---------------- |
| *<Term-1>* | *<definition-1>* |
| *<Term-2>* | *<definition-2>* |
